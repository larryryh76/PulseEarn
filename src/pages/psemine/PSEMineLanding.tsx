import React from 'react';
import { Link } from 'react-router-dom';
import { LOCKED_PSEMINE_TOOLS, PSEMINE_CONSTANTS } from '../../types/psemine';
import { gbp, gbpHour, usePseDocumentTitle } from '../../components/psemine/pseCore';
import { PSEmineLogo, PSEmineMark } from '../../components/psemine/PSEBrand';
import { PseTierModule } from '../../components/psemine/PseMechanism';
import {
  CampaignRail,
  CapacityGauge,
  FlowPipeline,
  HeroSpecimen,
  PaymentSpecimen,
  Reveal,
  Stat,
  StatGrid,
  TrustGrid,
  type PseFlowStep,
  type PseTierView,
} from '../../components/psemine/PseInstruments';

/**
 * PSEmine public page — `/mine`.
 *
 * CONTENT CONTRACT: PUBLIC LANDING ONLY.
 *   allowed · brand, the product proposition, explanation, the tool family,
 *             capacity, the campaign lifecycle, payment, settlement and payout,
 *             security and transparency, FAQ, calls to action
 *   banned  · any personal figure of any kind — balance, accrued earnings,
 *             capacity held, referral count, campaign position or days
 *             remaining, purchase status, quote, wallet or payout address,
 *             transaction record, activity history, account setting, console or
 *             admin control, internal architecture, entitlement/access
 *             explanation, fabricated activity or statistics
 *
 * THE PAGE READS NOTHING. It is static by construction: it renders locked
 * product economics from src/types/psemine.ts (the frontend mirror of
 * api/psemine_core.py) and nothing else. There is no session, no campaign read
 * and no request, so no account state can leak into it — and the route guard
 * (`PSEMineEntry`) sends a signed-in visitor to the console before this page is
 * mounted at all.
 *
 * COMPOSITION — the page is a product demonstration, not an article.
 *   Hero (copy + application specimen)
 *     01 · the purchase pipeline
 *     02 · the equipment family
 *     03 · the capacity instrument + how a referral qualifies
 *     04 · the campaign rail
 *     05 · the payment specimen + what a quote gives you
 *     06 · the settlement lifecycle
 *     07 · the trust grid
 *     08 · questions
 *     09 · the close
 *   Almost every section carries a real object — a gauge, a rail, a pipeline, a
 *   specimen, a grid of figures — because an instrument says what a paragraph
 *   has to spell out. Prose carries the argument; the objects carry the product.
 *
 * COPY RULE: the page describes the product, never the system behind it.
 */

const TOOLS = Object.values(LOCKED_PSEMINE_TOOLS).sort((a, b) => a.displayOrder - b.displayOrder);
const MAX_TIER_RATE = Math.max(...TOOLS.map(t => t.hourlyRateGBP));

const isContinuous = (t: (typeof TOOLS)[number]) => t.operating.model === 'continuous';

/** The tier roster in the shape the instruments consume. */
const TIERS: ReadonlyArray<PseTierView> = TOOLS.map(t => ({
  tier: t.tier,
  name: t.name.replace(/ Miner$/, ''),
  rate: gbpHour(t.hourlyRateGBP),
  price: gbp(t.purchasePriceGBP),
  limit: t.maxPerUser,
  continuous: isContinuous(t),
}));

/** The share of the strongest tier, so the four capacity bars are comparable. */
const tierWidth = (rate: number) => `${Math.round((rate / MAX_TIER_RATE) * 100)}%`;

/** The four tiers read as an increasing gradient, not four identical blue bars. */
const tierFill = (tier: number) =>
  tier >= 4
    ? 'linear-gradient(90deg, var(--pse-accent), var(--pse-cyan))'
    : tier === 3
      ? 'linear-gradient(90deg, var(--pse-accent), var(--pse-violet))'
      : 'var(--pse-accent)';

const NAV = [
  { href: '#how', label: 'How it works' },
  { href: '#tools', label: 'Tools' },
  { href: '#capacity', label: 'Capacity' },
  { href: '#payment', label: 'Payment' },
  { href: '#security', label: 'Security' },
  { href: '#faq', label: 'FAQ' },
];

/* ── Section furniture ──────────────────────────────────────────────────── */

const Section: React.FC<{
  id: string;
  num: string;
  kicker: string;
  title: string;
  lede?: React.ReactNode;
  band?: 'tint' | 'none';
  wide?: boolean;
  children: React.ReactNode;
}> = ({ id, num, kicker, title, lede, band = 'none', wide = false, children }) => (
  <section id={id} className={`pse-section${band === 'tint' ? ' pse-band--tint' : ''}`}>
    <div className="pse-wrap">
      <Reveal className={`pse-head${wide ? ' pse-head--wide' : ''}`}>
        <p className="pse-kicker">
          <span className="pse-kicker-num">{num}</span>
          <span className="pse-kicker-text">{kicker}</span>
        </p>
        <h2 className="pse-h2">{title}</h2>
        {lede && <p className="pse-body">{lede}</p>}
      </Reveal>
      <div className="mt-8 md:mt-10">{children}</div>
    </div>
  </section>
);

const Denom: React.FC<{ tone?: string; children: React.ReactNode }> = ({ tone, children }) => (
  <span className="pse-chip" data-tone={tone}>
    <span className="pse-chip-dot" aria-hidden="true" />
    {children}
  </span>
);

/* ── The purchase pipeline ──────────────────────────────────────────────── */

const PURCHASE: ReadonlyArray<PseFlowStep> = [
  {
    id: 'select',
    glyph: 'select',
    name: 'Select a unit',
    note: 'Choose from the fixed price list — one product line, four tiers, each with a locked price and hourly capacity.',
  },
  {
    id: 'pay',
    glyph: 'wallet',
    name: 'Pay with BNB',
    note: 'Request a quote, then send the exact BNB amount from your own wallet on BNB Smart Chain.',
  },
  {
    id: 'verify',
    glyph: 'verify',
    name: 'Verified on-chain',
    note: 'The payment is checked against the chain: the amount, the payer and the destination.',
  },
  {
    id: 'activate',
    glyph: 'activate',
    name: 'Unit activated',
    note: 'A verified purchase activates the unit, and its hourly capacity is added to the account.',
  },
];

/* ── The settlement lifecycle ───────────────────────────────────────────── */

const SETTLEMENT: ReadonlyArray<PseFlowStep> = [
  {
    id: 'accrue',
    glyph: 'accrue',
    name: 'Accrual',
    note: 'Live capacity accrues campaign earnings against a server-side checkpoint.',
    denom: <Denom>GBP</Denom>,
  },
  {
    id: 'settle',
    glyph: 'settle',
    name: 'Settlement',
    note: 'Accrual stops at the end of the window and final balances are computed.',
    denom: <Denom>GBP</Denom>,
  },
  {
    id: 'review',
    glyph: 'review',
    name: 'Review',
    note: 'Each payout passes a review before anything is sent.',
    denom: <Denom>GBP</Denom>,
  },
  {
    id: 'payout',
    glyph: 'payout',
    name: 'Payout',
    note: 'Settled GBP is disbursed to the payout wallet on the account.',
    denom: <Denom tone="bnb">BNB</Denom>,
  },
];

/* ── Security ───────────────────────────────────────────────────────────── */

const TRUST = [
  {
    glyph: 'server' as const,
    name: 'Backend-authoritative',
    note: 'Accrual, capacity and final balances are calculated server-side. The browser holds no authority over a figure.',
  },
  {
    glyph: 'chain' as const,
    name: 'Verified on-chain',
    note: 'A purchase is verified against BNB Smart Chain before any unit is activated.',
  },
  {
    glyph: 'audit' as const,
    name: 'Auditable',
    note: 'Every change to an account is written to that account\u2019s own activity record.',
  },
  {
    glyph: 'shield' as const,
    name: 'No custody',
    note: 'You keep your own keys. PSEmine never takes custody of funds and never asks for a private key.',
  },
];

/* ── FAQ ────────────────────────────────────────────────────────────────── */

const FAQ: ReadonlyArray<{ q: string; a: React.ReactNode }> = [
  {
    q: 'What is PSEmine, in one paragraph?',
    a: (
      <>
        PSEmine is a limited, campaign-based mining product. You buy mining units with BNB; each unit adds a fixed
        capacity per hour denominated in GBP; that capacity accrues campaign earnings while the campaign runs; and the
        earnings you have accrued are settled and paid out in BNB after the campaign ends. Nothing is mined on hardware
        you own or host: a unit is a campaign instrument with a locked price, a locked hourly capacity and an ownership
        limit, and the accrual itself is calculated by the PSEmine service.
      </>
    ),
  },
  {
    q: 'What exactly do I own?',
    a: (
      <>
        A recorded right to a unit&apos;s hourly capacity for the duration of the campaign. Ownership is per account and
        per tier, capped at {TOOLS.map(t => `${t.maxPerUser} ${t.name}`).join(', ')}. A unit&apos;s price and its hourly
        capacity are fixed in the product&apos;s locked economics, and both are shown before you pay.
      </>
    ),
  },
  {
    q: 'How does the campaign timeline run?',
    a: (
      <>
        The campaign runs for {PSEMINE_CONSTANTS.CAMPAIGN_DURATION_DAYS} days from its start date. While it is live,
        capacity accrues. When it ends, accrual stops, final balances are computed for settlement, and settled GBP is
        disbursed in BNB to the payout wallet on each account. If the campaign is paused, nothing accrues during the
        pause — the record of exactly when mining was live is kept server-side.
      </>
    ),
  },
  {
    q: 'How does a BNB purchase actually work?',
    a: (
      <>
        You request a quote for a unit. The price is fixed in GBP and converted to a BNB amount at the rate of that
        quote, and the quote is time-limited — the time left is shown on it. You then pay that exact amount from your own
        wallet on {PSEMINE_CONSTANTS.PAYMENT_NETWORK_NAME}, to the address that quote prints for you. Once the
        transaction is confirmed on-chain it is verified and the unit is activated. If a quote expires, or a payment does
        not match it, the purchase is recorded as expired or underpaid rather than silently absorbed.
      </>
    ),
  },
  {
    q: 'What happens when a unit stops mining?',
    a: (
      <>
        Starter, Builder and Advanced units mine in fixed sessions and require a manual restart between them, with a
        short delay before the next session begins. Between sessions that unit accrues nothing. The Elite unit mines
        continuously while the campaign is active and never needs a restart. No unit earns anything while the campaign
        itself is paused or ended.
      </>
    ),
  },
  {
    q: 'How is capacity capped?',
    a: (
      <>
        Unit capacity tops out at {gbpHour(PSEMINE_CONSTANTS.MAX_TOOL_CAPACITY_GBP_PER_HOUR)} once you hold the maximum
        of every tier. Each qualified referral adds {gbpHour(PSEMINE_CONSTANTS.REFERRAL_BONUS_GBP_PER_HOUR)}, up to{' '}
        {PSEMINE_CONSTANTS.MAX_QUALIFIED_REFERRALS} referrals (
        {gbpHour(PSEMINE_CONSTANTS.MAX_REFERRAL_CAPACITY_GBP_PER_HOUR)}). Total capacity can therefore never exceed{' '}
        {gbpHour(PSEMINE_CONSTANTS.MAX_THEORETICAL_CAPACITY_GBP_PER_HOUR)}.
      </>
    ),
  },
  {
    q: 'When does a referral count?',
    a: (
      <>
        Only at the fifth and last stage: registered, wallet connected, unit purchased, mining active, qualified. Every
        stage is verified against the referral&apos;s own account records, and the capacity is added from the moment of
        qualification — never retroactively, and never for a referral that does not reach it.
      </>
    ),
  },
  {
    q: 'How does a payout work?',
    a: (
      <>
        Accrued GBP is campaign earnings, not a wallet balance. After settlement they are disbursed in BNB to the payout
        wallet configured on your account, and each payout passes a review before it is sent. Set your payout wallet
        before the campaign&apos;s wallet-change cutoff: after it, the address on file is the one that is paid. Both the
        purchase and the payout are written to the chain, so each direction is checkable rather than taken on trust.
      </>
    ),
  },
  {
    q: 'What is PSEmine not?',
    a: (
      <>
        It is not a promise of profit, a fixed APY, an investment product or a hardware sale. Hourly capacity is a
        campaign rate in GBP; campaign earnings depend on the campaign actually running for its window and on your units
        operating; and the settled amount is what the service recorded — nothing more. PSEmine does not guarantee any
        return, and no figure on this page is a projection.
      </>
    ),
  },
];

const FaqItem: React.FC<{ q: string; a: React.ReactNode; index: number }> = ({ q, a, index }) => {
  const [open, setOpen] = React.useState(index === 0);
  const panelId = `pse-faq-panel-${index}`;
  const buttonId = `pse-faq-q-${index}`;
  return (
    <div className="pse-faq-item">
      <button
        id={buttonId}
        type="button"
        className="pse-faq-q"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen(v => !v)}
      >
        <span>{q}</span>
        <span className="pse-faq-sign" aria-hidden="true" />
      </button>
      {open && (
        <div id={panelId} role="region" aria-labelledby={buttonId} className="pse-faq-a">
          <p className="pse-body pse-measure">{a}</p>
        </div>
      )}
    </div>
  );
};

/* ── The page ───────────────────────────────────────────────────────────── */

export const PSEMineLanding: React.FC = () => {
  usePseDocumentTitle('Campaign mining on BNB Smart Chain');

  const [menuOpen, setMenuOpen] = React.useState(false);

  React.useEffect(() => {
    if (!menuOpen) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setMenuOpen(false);
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [menuOpen]);

  const CreateAccount: React.FC<{ size?: 'lg' | 'sm' }> = ({ size = 'lg' }) => (
    <Link to="/mine/signup" className={`pse-btn ${size === 'lg' ? 'pse-btn--lg' : ''}${size === 'sm' ? ' pse-btn--sm' : ''}`}>
      Create an account
      <span className="pse-btn-arrow" aria-hidden="true">→</span>
    </Link>
  );

  return (
    <div className="pse pse-surface pse-plane min-h-screen">
      {/* ── Masthead: one compact bar, one menu control on small screens ─── */}
      <header className="pse-mast">
        <div className="pse-wrap pse-mast-inner">
          <Link to="/mine" aria-label="PSEmine home" className="inline-flex min-h-[44px] items-center">
            <PSEmineLogo size={26} decorative />
          </Link>

          <nav className="pse-mast-nav" aria-label="Page sections">
            {NAV.map(item => (
              <a key={item.href} className="pse-mast-link" href={item.href}>
                {item.label}
              </a>
            ))}
          </nav>

          <div className="pse-mast-actions">
            <Link to="/mine/login" className="pse-mast-link">Sign in</Link>
            <CreateAccount size="sm" />
            <button
              type="button"
              className="pse-burger"
              aria-expanded={menuOpen}
              aria-controls="pse-nav-drawer"
              aria-label={menuOpen ? 'Close menu' : 'Open menu'}
              onClick={() => setMenuOpen(v => !v)}
            >
              <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
                <path
                  d={menuOpen ? 'M4.5 4.5l9 9M13.5 4.5l-9 9' : 'M2.5 5.75h13M2.5 12.25h13'}
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                />
              </svg>
            </button>
          </div>
        </div>

        {menuOpen && (
          <div className="pse-drawer" id="pse-nav-drawer">
            <nav className="pse-drawer-nav" aria-label="Page sections">
              {NAV.map(item => (
                <a key={item.href} className="pse-drawer-link" href={item.href} onClick={() => setMenuOpen(false)}>
                  {item.label}
                </a>
              ))}
            </nav>
            <div className="pse-drawer-actions">
              <Link to="/mine/login" className="pse-btn pse-btn--secondary pse-btn--lg pse-btn--block">Sign in</Link>
              <CreateAccount />
            </div>
          </div>
        )}
      </header>

      {/* ── Hero: the argument, and the product that answers it ──────────── */}
      <section className="pse-wrap pse-hero">
        <Reveal className="pse-hero-copy">
          <span className="pse-chip">
            <span className="pse-chip-dot" aria-hidden="true" />
            Campaign-based mining capacity
          </span>
          <h1 className="pse-display mt-5">
            Capacity you hold for {PSEMINE_CONSTANTS.CAMPAIGN_DURATION_DAYS} days, settled and paid in BNB.
          </h1>
          <p className="pse-lead mt-5 max-w-[44ch]">
            PSEmine is a limited campaign with a fixed price list. Acquire units. Build capacity. Accrue campaign
            earnings. Receive your eligible payout after settlement.
          </p>

          <div className="pse-hero-cta mt-8">
            <CreateAccount />
            <a href="#how" className="pse-btn pse-btn--secondary pse-btn--lg">How it works</a>
          </div>

          <div className="pse-hero-meta mt-8">
            <span>{PSEMINE_CONSTANTS.CAMPAIGN_DURATION_DAYS}-day campaign</span>
            <span>{PSEMINE_CONSTANTS.PAYMENT_NETWORK_NAME}</span>
            <span>Earnings in GBP</span>
          </div>
        </Reveal>

        <HeroSpecimen
          days={PSEMINE_CONSTANTS.CAMPAIGN_DURATION_DAYS}
          ceiling={PSEMINE_CONSTANTS.MAX_THEORETICAL_CAPACITY_GBP_PER_HOUR}
          units={PSEMINE_CONSTANTS.MAX_TOOL_CAPACITY_GBP_PER_HOUR}
          referrals={PSEMINE_CONSTANTS.MAX_REFERRAL_CAPACITY_GBP_PER_HOUR}
          tiers={TIERS}
        />
      </section>

      {/* ── 01 · The purchase ────────────────────────────────────────────── */}
      <Section
        id="how"
        num="01"
        kicker="The purchase"
        wide
        title="Four steps, in order."
        lede="Every step below happens against an account record. This is the real sequence, drawn as a pipeline — it carries no live figure and no progress."
      >
        <FlowPipeline steps={PURCHASE} label="The PSEmine purchase sequence, in four steps" />
        <p className="pse-small mt-6 pse-measure">
          There is no card and no fiat on-ramp. A purchase is a BNB transaction you send from your own wallet, and every
          paying action happens on your own wallet and on a live quote only.
        </p>
      </Section>

      {/* ── 02 · The equipment family ────────────────────────────────────── */}
      <Section
        id="tools"
        num="02"
        kicker="The tool family"
        band="tint"
        wide
        title="One product line, four units."
        lede="Each tier has a fixed price, a fixed capacity per hour and an ownership limit. The price is paid in BNB at the rate quoted when you request the quote, so a unit's price never drifts with the market."
      >
        <div className="pse-tools">
          {TOOLS.map((tool, i) => (
            <Reveal
              key={tool.id}
              as="article"
              className="pse-tool"
              delay={i * 70}
            >
              <div className="pse-tool-top">
                <div>
                  <span className="pse-tool-name">{tool.name}</span>
                  <span className="pse-tool-tier">Tier {tool.tier}</span>
                </div>
                <span className="pse-chip" data-tone={isContinuous(tool) ? 'live' : undefined}>
                  <span className="pse-chip-dot" aria-hidden="true" />
                  {isContinuous(tool) ? 'Continuous' : 'Session'}
                </span>
              </div>

              <PseTierModule tier={tool.tier} continuous={isContinuous(tool)} width={96} />

              <div className="pse-tool-cap">
                <span className="pse-tool-rate">
                  {gbpHour(tool.hourlyRateGBP).replace('/hour', '')}
                  <span className="pse-tool-rate-unit">/hour</span>
                </span>
                <span className="pse-tool-track">
                  <span
                    className="pse-tool-fill"
                    style={{ '--pse-w': tierWidth(tool.hourlyRateGBP), '--pse-fill': tierFill(tool.tier) } as React.CSSProperties}
                  />
                </span>
              </div>

              <div className="pse-tool-meta">
                <span>
                  <span className="pse-tool-meta-key">Price</span>
                  <span className="pse-tool-meta-val">{gbp(tool.purchasePriceGBP)}</span>
                </span>
                <span>
                  <span className="pse-tool-meta-key">Ownership limit</span>
                  <span className="pse-tool-meta-val">{tool.maxPerUser} / account</span>
                </span>
              </div>

              <div className="pse-tool-foot">
                <span>{isContinuous(tool) ? 'No restart required' : 'Manual restart between sessions'}</span>
              </div>
            </Reveal>
          ))}
        </div>

        <p className="pse-small mt-7 pse-measure">
          Session units mine in fixed operating cycles and stop between them until they are restarted — nothing accrues
          between sessions, and a restart takes a short delay before the next session begins. Holding the maximum of
          every tier gives {gbpHour(PSEMINE_CONSTANTS.MAX_TOOL_CAPACITY_GBP_PER_HOUR)} of unit capacity.
        </p>
      </Section>

      {/* ── 03 · The capacity instrument ─────────────────────────────────── */}
      <Section
        id="capacity"
        num="03"
        kicker="Capacity model"
        wide
        title="Capacity is a rate, and it has a hard ceiling."
        lede="Two sources add capacity: the units you own, and referrals that actually qualify. Both are bounded, and both are computed server-side."
      >
        <div className="pse-columns pse-columns--weighted">
          <Reveal className="pse-panel pse-panel--raised" delay={40}>
            <div className="pse-panel-head">
              <span className="pse-h3">Capacity composition</span>
              <span className="pse-micro">£ per hour</span>
            </div>
            <div className="pse-panel-body">
              <CapacityGauge
                ceiling={PSEMINE_CONSTANTS.MAX_THEORETICAL_CAPACITY_GBP_PER_HOUR}
                units={PSEMINE_CONSTANTS.MAX_TOOL_CAPACITY_GBP_PER_HOUR}
                referrals={PSEMINE_CONSTANTS.MAX_REFERRAL_CAPACITY_GBP_PER_HOUR}
              />
            </div>
          </Reveal>

          <Reveal delay={120}>
            <p className="pse-micro mb-4">How a referral qualifies</p>
            <ol className="pse-ladder">
              {[
                ['Registered', 'Signed up with your referral code. Nothing is credited at this stage.'],
                ['Wallet connected', 'Connected a BNB Smart Chain wallet to their own account.'],
                ['Unit purchased', 'Bought a mining unit with their own funds.'],
                ['Mining active', 'The unit is operating inside the campaign.'],
                ['Qualified', 'All four stages verified — capacity is added from here, not before.'],
              ].map(([name, note], i, all) => (
                <li key={name} className="pse-ladder-step" data-final={i === all.length - 1 ? 'true' : undefined}>
                  <span className="pse-ladder-num" aria-hidden="true">{String(i + 1).padStart(2, '0')}</span>
                  <span>
                    <span className="pse-ladder-name">{name}</span>
                    <span className="pse-ladder-note">{note}</span>
                  </span>
                </li>
              ))}
            </ol>
          </Reveal>
        </div>

        <p className="pse-small mt-7 pse-measure">
          Referral capacity accrues only while you have a unit actually operating, and no capacity is credited
          retroactively for a referral that qualifies late.
        </p>
      </Section>

      {/* ── 04 · The campaign rail ───────────────────────────────────────── */}
      <Section
        id="campaign"
        num="04"
        kicker="Campaign lifecycle"
        band="tint"
        wide
        title={`A ${PSEMINE_CONSTANTS.CAMPAIGN_DURATION_DAYS}-day window with a defined end.`}
        lede="Mining is only live while the campaign is. Each phase changes what happens to accrual, and the record of it is kept."
      >
        <Reveal className="pse-panel" delay={40}>
          <div className="pse-panel-body">
            <CampaignRail
              days={PSEMINE_CONSTANTS.CAMPAIGN_DURATION_DAYS}
              phases={[
                { id: 'launch', name: 'Launch', note: 'The campaign opens and mining units become available to buy.' },
                { id: 'mining', name: 'Mining', note: 'Units operate and capacity accrues against a server-side checkpoint.' },
                { id: 'settlement', name: 'Settlement', note: 'Accrual stops at the end of the window and final balances are computed.' },
                { id: 'payout', name: 'Payout', note: 'Settled GBP is disbursed in BNB to payout wallets, after review.' },
                { id: 'closed', name: 'Closed', note: 'The campaign is finished. Records stay available on the account.' },
              ]}
            />
          </div>
        </Reveal>

        <Reveal className="mt-6" delay={120}>
          <StatGrid cols={3}>
            <Stat label="Campaign length" value={PSEMINE_CONSTANTS.CAMPAIGN_DURATION_DAYS} unit="days" note="Dated from launch" />
            <Stat label="Clock" value="Server" note="Never the browser's" />
            <Stat label="Pause" value="None" note="A paused campaign accrues nothing for anyone" />
          </StatGrid>
        </Reveal>
      </Section>

      {/* ── 05 · The purchase interface ──────────────────────────────────── */}
      <Section
        id="payment"
        num="05"
        kicker="Payment"
        wide
        title="You pay in BNB, at a quoted rate."
        lede="There is no card and no fiat on-ramp. A purchase is a BNB transaction you send from your own wallet on BNB Smart Chain."
      >
        <div className="pse-columns">
          <PaymentSpecimen
            unitName={TOOLS[0].name}
            price={gbp(TOOLS[0].purchasePriceGBP)}
            network={PSEMINE_CONSTANTS.PAYMENT_NETWORK_NAME}
            asset="BNB"
          />

          <Reveal delay={120}>
            <p className="pse-micro mb-4">What a quote gives you</p>
            <StatGrid cols={3}>
              <Stat label="Price" value="Fixed" note="Set in GBP, not floating with the market" />
              <Stat label="Amount" value="BNB" note="Exact amount at the rate of that quote" />
              <Stat label="Destination" value="On the quote" note="The only address you ever pay" />
              <Stat label="Time limit" value="Counted" note="The quote shows what is left of its own window" />
            </StatGrid>

            <p className="pse-small mt-6 pse-measure">
              A purchase that is never paid, is paid late, or is paid an incorrect amount is recorded as expired or
              underpaid and reviewed — never auto-corrected by the browser.
            </p>
            <p className="pse-small mt-3 pse-measure">
              The specimen beside you is an illustration of the flow, not a live quote: prices, rates and ownership
              limits are locked, but the BNB amount of any purchase is issued per quote.
            </p>
          </Reveal>
        </div>
      </Section>

      {/* ── 06 · The settlement lifecycle ────────────────────────────────── */}
      <Section
        id="payout"
        num="06"
        kicker="Settlement and payout"
        band="tint"
        wide
        title="Earnings are settled in GBP, then paid in BNB."
        lede="Accrual becomes payable only at settlement. Until then it is a running record, not a balance that can be moved — the pipeline below shows exactly where the denomination changes."
      >
        <FlowPipeline steps={SETTLEMENT} label="The PSEmine settlement lifecycle, from accrual to payout" />

        <div className="pse-columns mt-8">
          <p className="pse-small pse-measure">
            Set your payout wallet before the campaign&apos;s wallet-change cutoff. After it, the address on file is the
            one that is paid — the cutoff exists so a settled balance cannot be redirected.
          </p>
          <p className="pse-small pse-measure">
            Campaign earnings are not withdrawable mid-campaign. Accrual becomes payable only once settlement finalises
            it, and both the purchase and the payout are written to the chain, so each direction is checkable rather than
            taken on trust.
          </p>
        </div>
      </Section>

      {/* ── 07 · Security ────────────────────────────────────────────────── */}
      <Section
        id="security"
        num="07"
        kicker="Security and transparency"
        wide
        title="What is fixed, and what you can check."
        lede="These are properties of the product, not claims about it — each one holds whether or not you take our word for it."
      >
        <TrustGrid items={TRUST} />

        <div className="pse-columns mt-8">
          <p className="pse-body pse-measure">
            Prices, hourly rates, ownership limits and the capacity ceiling are locked: they are the same for every
            account and do not move with the market or with how much anyone holds. A unit&apos;s hourly capacity is
            confirmed when the purchase activates, and every change to an account is written to that account&apos;s
            activity record.
          </p>
          <p className="pse-body pse-measure">
            You keep your own keys. PSEmine never takes custody of funds, and never asks you to send anything anywhere
            other than the address printed on a live quote. A unit purchase goes from your wallet to the
            campaign&apos;s address for that purchase, and a payout goes to the payout wallet you set.
          </p>
        </div>
      </Section>

      {/* ── 08 · Questions ───────────────────────────────────────────────── */}
      <Section id="faq" num="08" kicker="Questions" wide title="The questions this product actually raises.">
        <Reveal className="pse-faq" delay={40}>
          {FAQ.map((item, i) => (
            <FaqItem key={item.q} q={item.q} a={item.a} index={i} />
          ))}
        </Reveal>
      </Section>

      {/* ── 09 · The close ───────────────────────────────────────────────── */}
      <section className="pse-section pse-band--lift">
        <div className="pse-wrap pse-close">
          <Reveal className="max-w-[52ch]">
            <span className="pse-chip">Open an account</span>
            <h2 className="pse-h2 mt-4">Choose your first unit.</h2>
            <p className="pse-body mt-3">
              An account is free. You spend nothing until you choose a unit and pay for it from your own wallet — and the
              price, the hourly capacity and the ownership limit are shown before you sign anything.
            </p>
          </Reveal>
          <Reveal className="pse-hero-cta shrink-0" delay={100}>
            <CreateAccount />
            <Link to="/mine/login" className="pse-btn pse-btn--secondary pse-btn--lg">Sign in</Link>
            <Link to="/mine/guide" className="pse-btn pse-btn--secondary pse-btn--lg">Read the guide</Link>
          </Reveal>
        </div>
      </section>

      {/* ── Footer ───────────────────────────────────────────────────────── */}
      <footer className="pse-foot">
        <div className="pse-wrap pse-foot-grid">
          <div className="space-y-3">
            <span className="pse-mark">
              <PSEmineMark size={24} decorative />
              <span className="pse-wordmark">
                <span className="pse-wordmark-name">PSEmine</span>
                <span className="pse-wordmark-sub">Campaign mining</span>
              </span>
            </span>
            <p className="pse-small max-w-[46ch]">
              A {PSEMINE_CONSTANTS.CAMPAIGN_DURATION_DAYS}-day mining campaign on {PSEMINE_CONSTANTS.PAYMENT_NETWORK_NAME}.
              Units are bought with BNB, capacity is priced in GBP per hour, and settled earnings are paid out in BNB.
            </p>
          </div>
          <nav className="pse-foot-links" aria-label="PSEmine footer">
            <Link className="pse-foot-link" to="/mine/guide">Campaign guide</Link>
            <Link className="pse-foot-link" to="/mine/signup">Create an account</Link>
            <Link className="pse-foot-link" to="/mine/login">Sign in</Link>
            <Link className="pse-foot-link" to="/help">Support</Link>
            <Link className="pse-foot-link" to="/terms">Terms</Link>
            <Link className="pse-foot-link" to="/privacy">Privacy</Link>
          </nav>
        </div>
        <div className="pse-wrap mt-8">
          <p className="pse-small max-w-[74ch]">
            No projected returns, no guaranteed earnings, no custody of your funds. Figures shown are PSEmine&apos;s
            locked economics. PSEmine is not an investment product and does not promise a return.
          </p>
        </div>
      </footer>
    </div>
  );
};

export default PSEMineLanding;
