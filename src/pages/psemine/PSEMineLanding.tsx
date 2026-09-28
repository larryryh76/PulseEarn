import React from 'react';
import { Link } from 'react-router-dom';
import { LOCKED_PSEMINE_TOOLS, PSEMINE_CONSTANTS } from '../../types/psemine';
import { gbp, gbpHour, usePseDocumentTitle } from '../../components/psemine/pseCore';
import { PSEmineLogo, PSEmineMark } from '../../components/psemine/PSEBrand';
import { PseTierModule } from '../../components/psemine/PseMechanism';
import { PSE_DOC_LABEL, PSE_DOC_PATH } from '../../components/psemine/pseDocs';
import { PsePolicyLinks } from './PSEminePolicy';
import {
  CapacityInstrument,
  FlowRail,
  LifecycleRail,
  PaymentConsole,
  PseAppWindow,
  Reveal,
  StatementPanel,
  Stat,
  StatGrid,
  ToolFamily,
  TrustMap,
  type PseBuildRow,
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
 * mounted at all. Where the page draws a figure it is either a locked product
 * constant or an EXAMPLE BUILD, labelled as such at the point it appears.
 *
 * COMPOSITION — the page is a product, not an article.
 *
 *   Hero ............. proposition left, a window of the PSEmine application
 *                      right, one floating tile overlapping the window's edge
 *   01 the purchase ... reading column left, the purchase rail right
 *   02 the tool family  full-bleed equipment plate on one printed scale
 *   03 capacity ....... the capacity instrument right, the referral ladder left
 *   04 the campaign .... a full-width lifecycle rail on a day axis
 *   05 payment ......... the purchase console left, the quote terms right
 *   06 settlement ...... a full-width statement, denomination change drawn
 *   07 security ........ a full-width relationship map, then the reading columns
 *   08 questions ....... head left, the accordion right
 *   09 the close ....... one band, one decision
 *
 * THE PLATE HEADER IS THE CONTINUITY DEVICE.
 * Every section opens with a datum rule: a hairline across the whole shell with
 * the section index sitting on it in a notch, the section's subject beside it and
 * its count or unit at the far end. Nine of those stacked make one continuous
 * spine running the length of the page — which is what stops nine sections from
 * reading as nine unrelated blocks — while the title and the lede sit in two
 * columns *below* the rule so the object underneath, not the heading, is what the
 * eye lands on. A section still carries prose; a section is never only prose.
 *
 * COPY RULE: the page describes the product, never the system behind it.
 */

const TOOLS = Object.values(LOCKED_PSEMINE_TOOLS).sort((a, b) => a.displayOrder - b.displayOrder);

const isContinuous = (t: (typeof TOOLS)[number]) => t.operating.model === 'continuous';

/** The tier roster in the shape the instruments consume. */
const TIERS: ReadonlyArray<PseTierView> = TOOLS.map(t => ({
  tier: t.tier,
  name: t.name.replace(/ Miner$/, ''),
  rate: gbpHour(t.hourlyRateGBP),
  rateValue: t.hourlyRateGBP,
  price: gbp(t.purchasePriceGBP),
  limit: t.maxPerUser,
  continuous: isContinuous(t),
}));

/**
 * The example build drawn inside the hero window.
 *
 * A hypothetical configuration of units — Starter ×2, Builder ×1, Elite ×1 — and
 * two qualified referrals. Every figure in the window is computed from it and from
 * the product's locked rates; none of it is read from anywhere. It is labelled an
 * example build in the window's own bar and footer, so it can never be taken for
 * an account.
 */
const BUILD_COUNTS: Record<number, number> = { 1: 2, 2: 1, 3: 0, 4: 1 };
const BUILD_REFERRALS = 2;

const EXAMPLE_BUILD: ReadonlyArray<PseBuildRow> = TIERS.map(t => ({ ...t, count: BUILD_COUNTS[t.tier] ?? 0 }));

const BUILD_TOOL_CAPACITY = EXAMPLE_BUILD.reduce((sum, row) => sum + row.count * row.rateValue, 0);
const BUILD_REFERRAL_CAPACITY = BUILD_REFERRALS * PSEMINE_CONSTANTS.REFERRAL_BONUS_GBP_PER_HOUR;

/** The specimen conversion rate used by the purchase illustration. */
const SPECIMEN_BNB_GBP = PSEMINE_CONSTANTS.FALLBACK_BNB_GBP_PRICE;

const NAV = [
  { href: '#how', label: 'How it works' },
  { href: '#tools', label: 'Tools' },
  { href: '#capacity', label: 'Capacity' },
  { href: '#payment', label: 'Payment' },
  { href: '#security', label: 'Security' },
  { href: '#faq', label: 'FAQ' },
];

/* ── Section furniture ──────────────────────────────────────────────────── */

/**
 * The plate header. A datum rule runs the full width of the shell carrying the
 * index, the subject and a right-aligned reading; the title and the lede sit in
 * two columns below it. Stacked down the page, the rules form one spine.
 *
 * `meta` is a real property of the section — a count, a unit, a range — never a
 * decorative label.
 */
const PlateHead: React.FC<{
  num: string;
  kicker: string;
  title: string;
  meta?: string;
  lede?: React.ReactNode;
}> = ({ num, kicker, title, meta, lede }) => (
  <Reveal className="pse-plate">
    <div className="pse-plate-rule">
      <span className="pse-plate-num" aria-hidden="true">{num}</span>
      <span className="pse-plate-kicker">{kicker}</span>
      {meta && <span className="pse-plate-meta">{meta}</span>}
    </div>
    <div className="pse-plate-text">
      <h2 className="pse-plate-title">{title}</h2>
      {lede && <p className="pse-body pse-plate-lede">{lede}</p>}
    </div>
  </Reveal>
);

/** The header for a full-bleed instrument: the plate, then the object. */
const Section: React.FC<{
  id: string;
  num: string;
  kicker: string;
  title: string;
  meta?: string;
  lede?: React.ReactNode;
  band?: 'tint';
  /** The instrument, rendered full width under the header. */
  children: React.ReactNode;
  foot?: React.ReactNode;
}> = ({ id, num, kicker, title, meta, lede, band, children, foot }) => (
  <section id={id} className={`pse-section${band === 'tint' ? ' pse-band--tint' : ''}`}>
    <div className="pse-wrap">
      <PlateHead num={num} kicker={kicker} title={title} meta={meta} lede={lede} />
      <div className="pse-section-object">{children}</div>
      {foot && <div className="pse-section-foot">{foot}</div>}
    </div>
  </section>
);

/** An asymmetric split: the reading column on one side, the object on the other. */
const Split: React.FC<{
  /** Which side carries the object. */
  object: 'start' | 'end';
  /** How much of the row the object takes. */
  weight?: 'even' | 'object-heavy';
  className?: string;
  children: React.ReactNode;
}> = ({ object, weight = 'object-heavy', className = '', children }) => (
  <div
    className={`pse-split pse-split--object-${object}${weight === 'even' ? ' pse-split--even' : ''}${
      className ? ` ${className}` : ''
    }`}
  >
    {children}
  </div>
);

/**
 * The documents at the point of decision.
 *
 * A policy that only exists in the footer is a policy nobody reads before they
 * spend money, so every section that commits the reader to something states the
 * documents that govern it, right where the commitment is described.
 */
const DocLine: React.FC<{ label: string; docs: Array<'campaign-terms' | 'purchase-terms' | 'payout-policy' | 'referral-terms' | 'risk'> }> = ({
  label,
  docs,
}) => (
  <p className="pse-docline">
    <span className="pse-docline-label">{label}</span>
    {docs.map(id => (
      <Link key={id} to={PSE_DOC_PATH[id]} className="pse-link pse-docline-link">
        {PSE_DOC_LABEL[id]}
      </Link>
    ))}
  </p>
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
    denom: <Denom tone="bnb">BNB</Denom>,
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

/* ── The settlement statement ───────────────────────────────────────────── */

const SETTLEMENT = [
  {
    id: 'accrue',
    glyph: 'accrue' as const,
    name: 'Accrual',
    unit: 'GBP',
    note: 'Live capacity accrues campaign earnings against a server-side checkpoint.',
  },
  {
    id: 'settle',
    glyph: 'settle' as const,
    name: 'Settlement',
    unit: 'GBP',
    note: 'Accrual stops at the end of the window and final balances are computed.',
  },
  {
    id: 'review',
    glyph: 'review' as const,
    name: 'Review',
    unit: 'GBP',
    note: 'Each payout passes a review before anything is sent.',
  },
  {
    id: 'payout',
    glyph: 'payout' as const,
    name: 'Payout',
    unit: 'BNB',
    note: 'Settled GBP is disbursed to the payout wallet on the account.',
    terminal: true,
  },
];

/* ── The campaign phases ────────────────────────────────────────────────── */

const PHASES = [
  {
    id: 'launch',
    name: 'Launch',
    note: 'Opens the campaign · units become available',
    detail: 'The campaign opens and mining units become available to buy.',
  },
  {
    id: 'mining',
    name: 'Mining',
    note: 'Capacity accrues · checkpointed server-side',
    detail: 'Units operate and capacity accrues against a server-side checkpoint.',
  },
  {
    id: 'settlement',
    name: 'Settlement',
    note: 'Accrual stops · final balances computed',
    detail: 'Accrual stops at the end of the window and final balances are computed.',
  },
  {
    id: 'payout',
    name: 'Payout',
    note: 'Disbursed in BNB · after review',
    detail: 'Settled GBP is disbursed in BNB to payout wallets, after review.',
  },
  {
    id: 'closed',
    name: 'Closed',
    note: 'Finished · records remain on the account',
    detail: 'The campaign is finished. Records stay available on the account.',
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
    <div className="pse-faq-item" data-open={open ? 'true' : undefined}>
      <button
        id={buttonId}
        type="button"
        className="pse-faq-q"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen(v => !v)}
      >
        <span className="pse-faq-index" aria-hidden="true">{String(index + 1).padStart(2, '0')}</span>
        <span className="pse-faq-text">{q}</span>
        <span className="pse-faq-sign" aria-hidden="true" />
      </button>
      {open && (
        <div id={panelId} role="region" aria-labelledby={buttonId} className="pse-faq-a">
          <p className="pse-body">{a}</p>
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
            <Link to="/mine/login" className="pse-mast-link">
              Sign in
            </Link>
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
              <Link to="/mine/login" className="pse-btn pse-btn--secondary pse-btn--lg pse-btn--block">
                Sign in
              </Link>
              <CreateAccount />
            </div>
          </div>
        )}
      </header>

      {/* ── Hero: the argument left, the product that answers it right ───── */}
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

          <dl className="pse-hero-meta mt-9">
            <div>
              <dt>Campaign</dt>
              <dd>{PSEMINE_CONSTANTS.CAMPAIGN_DURATION_DAYS} days</dd>
            </div>
            <div>
              <dt>Network</dt>
              <dd>{PSEMINE_CONSTANTS.PAYMENT_NETWORK_NAME}</dd>
            </div>
            <div>
              <dt>Earnings in</dt>
              <dd>GBP</dd>
            </div>
          </dl>
        </Reveal>

        <PseAppWindow
          days={PSEMINE_CONSTANTS.CAMPAIGN_DURATION_DAYS}
          ceiling={PSEMINE_CONSTANTS.MAX_THEORETICAL_CAPACITY_GBP_PER_HOUR}
          toolCapacity={BUILD_TOOL_CAPACITY}
          referralCapacity={BUILD_REFERRAL_CAPACITY}
          build={EXAMPLE_BUILD}
        />
      </section>

      {/* ── 01 · The purchase: reading column left, the rail right ───────── */}
      <section id="how" className="pse-section">
        <div className="pse-wrap">
          <Split object="end">
            <div className="pse-split-text">
              <PlateHead
                num="01"
                kicker="The purchase"
                title="Four steps, in order."
                meta="4 stages"
                lede="Every step below happens against an account record. This is the real sequence, drawn as a pipeline — it carries no live figure and no progress."
              />
              <p className="pse-small pse-measure pse-split-aside">
                There is no card and no fiat on-ramp. A purchase is a BNB transaction you send from your own wallet, and
                every paying action happens on your own wallet and on a live quote only.
              </p>
              <DocLine label="Before you begin" docs={['campaign-terms', 'risk']} />
            </div>
            <FlowRail steps={PURCHASE} label="The PSEmine purchase sequence, in four steps" />
          </Split>
        </div>
      </section>

      {/* ── 02 · The tool family: one full-bleed equipment plate ─────────── */}
      <Section
        id="tools"
        num="02"
        kicker="The tool family"
        band="tint"
        title="One product line, four units."
        meta={`${TIERS.length} units · £${TIERS[0].rateValue.toFixed(2)}–£${TIERS[TIERS.length - 1].rateValue.toFixed(2)}/hour`}
        lede="Each tier has a fixed price, a fixed capacity per hour and an ownership limit. The price is paid in BNB at the rate quoted when you request the quote, so a unit's price never drifts with the market."
        foot={
          <p className="pse-small">
            Session units mine in fixed operating cycles and stop between them until they are restarted — nothing accrues
            between sessions, and a restart takes a short delay before the next session begins. Holding the maximum of
            every tier gives {gbpHour(PSEMINE_CONSTANTS.MAX_TOOL_CAPACITY_GBP_PER_HOUR)} of unit capacity.
          </p>
        }
      >
        <ToolFamily tiers={TIERS} />
      </Section>

      {/* ── 03 · The capacity instrument: the object right, the rail left ── */}
      <section id="capacity" className="pse-section">
        <div className="pse-wrap">
          <Split object="end" weight="even">
            <div className="pse-split-text">
              <PlateHead
                num="03"
                kicker="Capacity model"
                title="Capacity is a rate, and it has a hard ceiling."
                meta={`ceiling ${gbpHour(PSEMINE_CONSTANTS.MAX_THEORETICAL_CAPACITY_GBP_PER_HOUR)}`}
                lede="Two sources add capacity: the units you own, and referrals that actually qualify. Both are bounded, and both are computed server-side."
              />
              <p className="pse-micro pse-split-aside mt-8">How a referral qualifies</p>
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
              <p className="pse-small pse-measure mt-7">
                Referral capacity accrues only while you have a unit actually operating, and no capacity is credited
                retroactively for a referral that qualifies late.
              </p>
              <DocLine label="Governs referrals" docs={['referral-terms']} />
            </div>

            <Reveal className="pse-panel pse-panel--raised" delay={60}>
              <div className="pse-panel-head">
                <span className="pse-h3">Capacity composition</span>
                <span className="pse-micro">£ per hour</span>
              </div>
              <div className="pse-panel-body">
                <CapacityInstrument
                  scale
                  ceiling={PSEMINE_CONSTANTS.MAX_THEORETICAL_CAPACITY_GBP_PER_HOUR}
                  units={PSEMINE_CONSTANTS.MAX_TOOL_CAPACITY_GBP_PER_HOUR}
                  referrals={PSEMINE_CONSTANTS.MAX_REFERRAL_CAPACITY_GBP_PER_HOUR}
                />
              </div>
            </Reveal>
          </Split>
        </div>
      </section>

      {/* ── 04 · The campaign lifecycle: a rail the reader can step through ─ */}
      <Section
        id="campaign"
        num="04"
        kicker="Campaign lifecycle"
        band="tint"
        title={`A ${PSEMINE_CONSTANTS.CAMPAIGN_DURATION_DAYS}-day window with a defined end.`}
        meta={`${PHASES.length} phases`}
        lede="Mining is only live while the campaign is. Each phase changes what happens to accrual, and the record of it is kept."
      >
        <LifecycleRail
          days={PSEMINE_CONSTANTS.CAMPAIGN_DURATION_DAYS}
          phases={PHASES.map(p => ({ id: p.id, name: p.name, note: p.note, detail: p.detail }))}
        />

        <Reveal className="mt-8" delay={120}>
          <StatGrid cols={3}>
            <Stat label="Campaign length" value={PSEMINE_CONSTANTS.CAMPAIGN_DURATION_DAYS} unit="days" note="Dated from launch" />
            <Stat label="Clock" value="Server" note="Never the browser's" />
            <Stat label="Pause" value="None" note="A paused campaign accrues nothing for anyone" />
          </StatGrid>
        </Reveal>
      </Section>

      {/* ── 05 · Payment: the purchase console left, the quote terms right ─ */}
      <section id="payment" className="pse-section">
        <div className="pse-wrap">
          <PlateHead
            num="05"
            kicker="Payment"
            title="You pay in BNB, at a quoted rate."
            meta="GBP → BNB"
            lede="There is no card and no fiat on-ramp. A purchase is a BNB transaction you send from your own wallet on BNB Smart Chain."
          />
          <Split object="start" className="pse-section-object">
            <PaymentConsole
              tier={TIERS[0]}
              network={PSEMINE_CONSTANTS.PAYMENT_NETWORK_NAME}
              asset="BNB"
              priceGBP={TOOLS[0].purchasePriceGBP}
              rateGBP={SPECIMEN_BNB_GBP}
            />

            <Reveal delay={120}>
              <p className="pse-micro mb-4">What a quote gives you</p>
              <StatGrid cols={2}>
                <Stat label="Price" value="Fixed" note="Set in GBP, not floating with the market" />
                <Stat label="Amount" value="BNB" note="Exact amount at the rate of that quote" />
                <Stat label="Destination" value="On the quote" note="The only address you ever pay" />
                <Stat label="Time limit" value="Counted" note="The quote shows what is left of its own window" />
              </StatGrid>

              <p className="pse-small pse-measure mt-6">
                A purchase that is never paid, is paid late, or is paid an incorrect amount is recorded as expired or
                underpaid and reviewed — never auto-corrected by the browser.
              </p>
              <p className="pse-small pse-measure mt-3">
                The specimen beside you is an illustration of the flow, not a live quote: prices, rates and ownership
                limits are locked, but the BNB amount of any purchase is issued per quote.
              </p>
              <DocLine label="Governs a purchase" docs={['purchase-terms', 'campaign-terms']} />
            </Reveal>
          </Split>
        </div>
      </section>

      {/* ── 06 · Settlement: a full-bleed statement, one denomination change ─ */}
      <Section
        id="payout"
        num="06"
        kicker="Settlement and payout"
        band="tint"
        title="Earnings are settled in GBP, then paid in BNB."
        meta="GBP → approved → BNB"
        lede="Accrual becomes payable only at settlement. Until then it is a running record, not a balance that can be moved — the statement below shows exactly where the denomination changes."
      >
        <StatementPanel steps={SETTLEMENT} />

        <Split object="start" weight="even" className="mt-8">
          <p className="pse-small">
            Set your payout wallet before the campaign&apos;s wallet-change cutoff. After it, the address on file is the
            one that is paid — the cutoff exists so a settled balance cannot be redirected.
          </p>
          <p className="pse-small">
            Campaign earnings are not withdrawable mid-campaign. Accrual becomes payable only once settlement finalises
            it, and both the purchase and the payout are written to the chain, so each direction is checkable rather than
            taken on trust.
          </p>
        </Split>

        <DocLine label="Governs a payout" docs={['payout-policy', 'risk']} />
      </Section>

      {/* ── 07 · Security: one relationship map, then the reading columns ── */}
      <Section
        id="security"
        num="07"
        kicker="Security and transparency"
        title="What is fixed, and what you can check."
        meta={`${TRUST.length} properties`}
        lede="These are properties of the product, not claims about it — each one holds whether or not you take our word for it."
      >
        <TrustMap items={TRUST} />

        <Split object="start" weight="even" className="mt-8">
          <p className="pse-body">
            Prices, hourly rates, ownership limits and the capacity ceiling are locked: they are the same for every
            account and do not move with the market or with how much anyone holds. A unit&apos;s hourly capacity is
            confirmed when the purchase activates, and every change to an account is written to that account&apos;s
            activity record.
          </p>
          <p className="pse-body">
            You keep your own keys. PSEmine never takes custody of funds, and never asks you to send anything anywhere
            other than the address printed on a live quote. A unit purchase goes from your wallet to the
            campaign&apos;s address for that purchase, and a payout goes to the payout wallet you set.
          </p>
        </Split>
      </Section>

      {/* ── 08 · Questions: head left, the accordion right ──────────────── */}
      <section id="faq" className="pse-section pse-band--tint">
        <div className="pse-wrap">
          <Split object="end" weight="even">
            <div className="pse-split-text pse-faq-head">
              <PlateHead num="08" kicker="Questions" title="The questions this product actually raises." meta={`${FAQ.length} answered`} />
            </div>
            <Reveal className="pse-faq" delay={60}>
              {FAQ.map((item, i) => (
                <FaqItem key={item.q} q={item.q} a={item.a} index={i} />
              ))}
            </Reveal>
          </Split>
        </div>
      </section>

      {/* ── 09 · The close ──────────────────────────────────────────────── */}
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
          <Reveal className="pse-close-side" delay={100}>
            <span className="pse-close-art" aria-hidden="true">
              <PseTierModule tier={TIERS[TIERS.length - 1].tier} continuous width={228} />
            </span>
            <div className="pse-hero-cta">
              <CreateAccount />
              <Link to="/mine/login" className="pse-btn pse-btn--secondary pse-btn--lg">Sign in</Link>
              <Link to="/mine/guide" className="pse-btn pse-btn--secondary pse-btn--lg">Read the guide</Link>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ── Footer ──────────────────────────────────────────────────────── */}
      <footer className="pse-foot">
        <div className="pse-wrap pse-foot-grid pse-foot-grid--navs">
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
          {/* Two labelled columns rather than one undifferentiated list: a
              person looking for "how do I start" and a person looking for
              "what did I agree to" are asking different questions. */}
          <div className="pse-foot-navs">
            <nav className="pse-foot-links" aria-label="PSEmine">
              <span className="pse-foot-col-head">Product</span>
              <Link className="pse-foot-link" to="/mine/guide">Campaign guide</Link>
              <Link className="pse-foot-link" to="/mine/signup">Create an account</Link>
              <Link className="pse-foot-link" to="/mine/login">Sign in</Link>
              <Link className="pse-foot-link" to="/mine/support">Support</Link>
            </nav>
            {/* The documents live in the footer, but they are not footer-only:
                each one is also linked at the point in the page where a person
                commits to the thing it covers. */}
            <PsePolicyLinks className="pse-foot-links" heading="Policies" />
          </div>
        </div>
        <div className="pse-wrap mt-8">
          <p className="pse-small max-w-[74ch]">
            No projected returns, no guaranteed earnings, no custody of your funds. Figures shown are PSEmine&apos;s
            locked economics. PSEmine is not an investment product and does not promise a return.{' '}
            <Link to={PSE_DOC_PATH.risk} className="pse-link">
              Read the risk disclosure
            </Link>
            .
          </p>
        </div>
      </footer>
    </div>
  );
};

export default PSEMineLanding;
