import React from 'react';
import { Link } from 'react-router-dom';
import { LOCKED_PSEMINE_TOOLS, PSEMINE_CONSTANTS } from '../../types/psemine';
import { gbp, gbpHour, usePseDocumentTitle } from '../../components/psemine/pseCore';
import { PSEmineLogo, PSEmineMark } from '../../components/psemine/PSEBrand';
import { PseTierModule } from '../../components/psemine/PseMechanism';
import { PSE_DOC_LABEL, PSE_DOC_PATH } from '../../components/psemine/pseDocs';
import { PsePolicyLinks } from './PSEminePolicy';
import {
  CapacityChain,
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
  type PseAppSpineLink,
  type PseBuildRow,
  type PseChainSource,
  type PseChainStep,
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
 *   01 how it works ... reading column left, the four-step entry rail right
 *   02 the tool family  full-bleed equipment plate on one printed scale
 *   03 capacity ....... the capacity instrument right, the referral ladder left
 *   04 the campaign .... a full-width lifecycle rail on a day axis
 *   05 payment ......... the purchase console left, the quote terms right
 *   06 settlement ...... a full-width statement, then the payout terms sheet
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
 * the product's locked rates; none of it is read from anywhere. The window's own
 * bar and footer label it a scenario built at published campaign rates, so it can
 * never be taken for an account.
 */
const BUILD_COUNTS: Record<number, number> = { 1: 2, 2: 1, 3: 0, 4: 1 };
const BUILD_REFERRALS = 2;

const EXAMPLE_BUILD: ReadonlyArray<PseBuildRow> = TIERS.map(t => ({ ...t, count: BUILD_COUNTS[t.tier] ?? 0 }));

const BUILD_TOOL_CAPACITY = EXAMPLE_BUILD.reduce((sum, row) => sum + row.count * row.rateValue, 0);
const BUILD_REFERRAL_CAPACITY = BUILD_REFERRALS * PSEMINE_CONSTANTS.REFERRAL_BONUS_GBP_PER_HOUR;
const BUILD_UNITS = EXAMPLE_BUILD.reduce((sum, row) => sum + row.count, 0);

/** The product's own ranges, stated once so the hero can print them. */
const PRICE_RANGE = `£${TOOLS[0].purchasePriceGBP} – £${TOOLS[TOOLS.length - 1].purchasePriceGBP}`;
const RATE_RANGE = `${gbpHour(TOOLS[0].hourlyRateGBP).replace('/hour', '')} – ${gbpHour(
  TOOLS[TOOLS.length - 1].hourlyRateGBP,
).replace('/hour', '')}`;

/**
 * The scenario's campaign spine.
 *
 * The brief the hero was failing: a reader should see, in one line and in the
 * product's own units, what owning a unit becomes. Referrals fold in here as
 * their own link because they are a real second source of capacity, and the
 * whole chain then runs in order — units → capacity → campaign → earnings →
 * settlement → payout — so the window draws the instrument rather than
 * describing it. Every figure is the example build's, computed from the locked
 * rates. Earnings are stated as a STAGE of the chain, never as an amount: a
 * projected figure would be invented, and this page does not invent figures.
 */
const SCENARIO_SPINE: ReadonlyArray<PseAppSpineLink> = [
  { id: 'units', label: 'Units', value: `×${BUILD_UNITS}` },
  {
    id: 'capacity',
    label: 'Capacity',
    value: `£${(BUILD_TOOL_CAPACITY + BUILD_REFERRAL_CAPACITY).toFixed(2)}/h`,
    lead: true,
  },
  { id: 'window', label: 'Campaign', value: `${PSEMINE_CONSTANTS.CAMPAIGN_DURATION_DAYS} days` },
  { id: 'earnings', label: 'Earnings', value: 'Accrued' },
  { id: 'settlement', label: 'Settlement', value: 'GBP' },
  { id: 'payout', label: 'Payout', value: 'BNB' },
];

/** The capacity model: two sources, one ceiling, and what the ceiling becomes. */
const CAPACITY_SOURCES: ReadonlyArray<PseChainSource> = [
  { label: 'Units owned', value: `${gbpHour(PSEMINE_CONSTANTS.MAX_TOOL_CAPACITY_GBP_PER_HOUR)} max`, tone: 'accent' },
  {
    label: 'Qualified referrals',
    value: `+${gbpHour(PSEMINE_CONSTANTS.MAX_REFERRAL_CAPACITY_GBP_PER_HOUR)} max`,
    tone: 'cyan',
  },
];

const CAPACITY_STEPS: ReadonlyArray<PseChainStep> = [
  {
    id: 'capacity',
    label: 'Mining capacity',
    value: gbpHour(PSEMINE_CONSTANTS.MAX_THEORETICAL_CAPACITY_GBP_PER_HOUR),
    note: 'The ceiling, however the account is built',
  },
  {
    id: 'window',
    label: 'Campaign window',
    value: `${PSEMINE_CONSTANTS.CAMPAIGN_DURATION_DAYS} days`,
    note: 'Accrual only while mining is live',
  },
  { id: 'settlement', label: 'Settled in', value: 'GBP', note: 'Final balances computed at the end' },
  { id: 'payout', label: 'Paid in', value: 'BNB', note: 'Disbursed to the payout wallet' },
];

/** The rules a quote carries. Product education, not a live quote. */
const QUOTE_RULES = [
  { term: 'Price', rule: 'Fixed in GBP before the quote is issued, and it does not float with the market.' },
  { term: 'Amount', rule: 'The exact BNB at the rate of that quote — a figure, not a range or an estimate.' },
  { term: 'Destination', rule: 'One address, printed on the quote. PSEmine asks you to send nowhere else.' },
  { term: 'Validity', rule: 'A counted window. A quote that lapses cannot be paid, and is recorded as expired.' },
  { term: 'Wrong amount', rule: 'A partial or mismatched payment is recorded as underpaid and reviewed — never absorbed.' },
] as const;

/** The scenario conversion rate used by the purchase illustration. */
const SCENARIO_BNB_GBP = PSEMINE_CONSTANTS.FALLBACK_BNB_GBP_PRICE;

/**
 * The nav, carrying the same indices the section plates print.
 *
 * The page's continuity device is the numbered datum rule at the head of every
 * section; the nav now states those numbers too, so the menu and the spine are
 * one system rather than two unrelated lists of words. The `Campaign` entry was
 * missing: the single most important section on the page had no way in.
 */
const NAV = [
  { href: '#how', label: 'How it works', num: '01' },
  { href: '#tools', label: 'Tools', num: '02' },
  { href: '#capacity', label: 'Capacity', num: '03' },
  { href: '#campaign', label: 'Campaign', num: '04' },
  { href: '#payment', label: 'Payment', num: '05' },
  { href: '#faq', label: 'FAQ', num: '08' },
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
    {/* Adjacent, separately reachable document links rather than a link embedded
        mid-sentence, so each one carries a real touch target on the small screens
        this product is designed for. */}
    {docs.map(id => (
      <Link
        key={id}
        to={PSE_DOC_PATH[id]}
        className="pse-link pse-docline-link inline-flex min-h-[44px] items-center"
      >
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

/**
 * The rules a payout runs on.
 *
 * The statement above the sheet shows the SEQUENCE — accrual, settlement,
 * review, payout. This states the terms that decide whether a settled balance
 * actually reaches a wallet: the address, the review, the denomination, the
 * record, and when a figure is payable at all. All five are the product's own
 * published rules, not commentary on them.
 */
const PAYOUT_TERMS = [
  {
    term: 'Payout wallet',
    rule: 'Record the wallet you want settled funds sent to, and set it before the campaign\u2019s wallet-change cutoff. After the cutoff the address on file is the address that is paid, so a settled balance cannot be redirected.',
  },
  {
    term: 'Review',
    rule: 'Every payout passes a review before it is sent. Where a figure needs reconciling, the reason is recorded against the payout, and a held payout is a delay rather than a forfeiture.',
  },
  {
    term: 'Denomination',
    rule: 'Campaign accounting runs in GBP from accrual through settlement, and the payout itself is made in BNB at the rate in force when it is processed. The payout record states both figures.',
  },
  {
    term: 'During the campaign',
    rule: 'Campaign earnings accrue as a running record while the campaign runs. They become payable at settlement, and payouts are made from a settled, approved balance.',
  },
  {
    term: 'Record',
    rule: 'The purchase and the payout are both on-chain transactions, so each direction is checkable against BNB Smart Chain rather than taken on trust.',
  },
];

/* ── The campaign phases ────────────────────────────────────────────────── */

/**
 * The campaign lifecycle, in its real seven phases.
 *
 * The section previously drew five phases and called one of them "Launch",
 * which is not a state the product has: a campaign is DATED before it is active.
 * Each phase now also carries WHEN it happens in campaign days, so the rail is a
 * timeline rather than a list of seven words — and the two phases where money
 * actually changes hands are no longer indistinguishable from the other five.
 *
 * No phase is marked as current, and no phase says how far along anything is: a
 * public page cannot know that, and inventing it is the one thing this page must
 * never do.
 */
const PHASES = [
  {
    id: 'scheduled',
    name: 'Scheduled',
    when: 'before day 0',
    note: 'Dated and published · nothing accrues',
    detail: 'The campaign is dated, its price list is published and its capacity ceiling is fixed. Mining has not started, so nothing accrues for anyone.',
  },
  {
    id: 'active',
    name: 'Active',
    when: 'day 0 → 90',
    note: 'Mining live · capacity accrues',
    detail: 'Units operate and capacity accrues against a server-side checkpoint. Purchases and referral qualification are open while the campaign is active.',
  },
  {
    id: 'ends',
    name: 'Mining ends',
    when: 'day 90',
    note: 'Accrual stops at the published end time',
    detail: 'Mining runs to the campaign\u2019s published end and stops there. Accrual is finalised from the record of when mining was actually live.',
  },
  {
    id: 'settlement',
    name: 'Settlement',
    when: 'after day 90',
    note: 'Final balances computed in GBP',
    detail: 'Accrual is finalised and the GBP balance each account accrued is computed. At that point the running figure becomes a settled balance, and settlement is where a payout becomes payable.',
  },
  {
    id: 'payout',
    name: 'Payout',
    when: 'after review',
    note: 'Payout processing · disbursed in BNB',
    detail: 'Each payout passes a review before anything is sent. Settled GBP is then disbursed in BNB to the payout wallet on the account.',
  },
  {
    id: 'closed',
    name: 'Closed',
    when: 'after payout',
    note: 'No further movement',
    detail: 'The campaign is finished and no further accrual, purchase or payout occurs. Records stay available on the account.',
  },
  {
    id: 'archived',
    name: 'Archived',
    when: '90 days on',
    note: 'Retained as a record',
    detail: 'After the archive window the campaign is archived — kept as a record and read-only, rather than remaining an active product.',
  },
];

/* ── Security ───────────────────────────────────────────────────────────── */

const TRUST = [
  {
    glyph: 'server' as const,
    name: 'Backend-authoritative',
    note: 'Capacity, accrual and final balances are calculated server-side and recorded before they are shown.',
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
    name: 'Self-custody',
    note: 'You keep your own keys. A payout is sent to the wallet you record, and PSEmine never holds your funds or asks for a private key.',
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
        Accrued GBP is campaign earnings, and it becomes payable at settlement. Settled earnings are disbursed in BNB to
        the payout wallet configured on your account, and each payout passes a review before it is sent. Set your payout
        wallet before the campaign&apos;s wallet-change cutoff: after it, the address on file is the one that is paid.
        Both the purchase and the payout are written to the chain, so each direction is checkable rather than taken on
        trust.
      </>
    ),
  },
  {
    q: 'What kind of product is PSEmine?',
    a: (
      <>
        PSEmine is a dated, campaign-based mining product with published, locked economics. Four units are sold, each with
        a fixed price, a fixed capacity in GBP per hour and an ownership cap, and none of those figures moves while the
        campaign runs. A unit is a campaign instrument rather than hardware you own or host: the service operates it, adds
        its capacity to your account for the campaign window, accrues campaign earnings on it while mining is live, and
        pays out the settled result in BNB under the campaign rules. Everything the product uses — the campaign length,
        the price list, the hourly rates, the ownership caps — is published before you buy.
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

  /**
   * The section the reader is actually in.
   *
   * A nine-section page with a six-entry menu needs the menu to say where you
   * are; without it the nav is a set of labels that behave identically whether or
   * not they describe the thing on screen. The observer watches the narrow band
   * across the middle of the viewport, so exactly one section is "current" at a
   * time, and nothing is marked until the reader has scrolled into the page.
   */
  const [currentSection, setCurrentSection] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (typeof IntersectionObserver === 'undefined') return;
    const targets = NAV.map(item => document.getElementById(item.href.slice(1))).filter(
      (el): el is HTMLElement => Boolean(el),
    );
    if (targets.length === 0) return;
    const observer = new IntersectionObserver(
      entries => {
        const hit = entries
          .filter(entry => entry.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
        if (hit) setCurrentSection(`#${hit.target.id}`);
      },
      { rootMargin: '-48% 0px -48% 0px', threshold: [0, 0.02, 0.25, 1] },
    );
    targets.forEach(el => observer.observe(el));
    return () => observer.disconnect();
  }, []);

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

          {/* The network the product settles on, stated once in the bar. It is a
              product fact, not a status: it carries no green dot and no "live". */}
          <span className="pse-mast-chip" aria-hidden="true">
            <span className="pse-chip-dot" />
            {PSEMINE_CONSTANTS.PAYMENT_NETWORK_NAME}
          </span>

          <nav className="pse-mast-nav" aria-label="Page sections">
            {NAV.map(item => (
              <a
                key={item.href}
                className="pse-mast-link"
                href={item.href}
                data-active={currentSection === item.href ? 'true' : undefined}
                aria-current={currentSection === item.href ? 'true' : undefined}
              >
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
                <a
                  key={item.href}
                  className="pse-drawer-link"
                  href={item.href}
                  onClick={() => setMenuOpen(false)}
                >
                  <span className="pse-drawer-num" aria-hidden="true">{item.num}</span>
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
            {PSEMINE_CONSTANTS.CAMPAIGN_DURATION_DAYS}-day campaign · fixed price list
          </span>
          {/*
           * The headline is the product in three moves, one per stage of the
           * chain the window beside it draws: what a unit builds, what that
           * capacity does while the campaign runs, and what happens to it at the
           * end. Three short sentences, each one true, and between them they
           * state the whole model before a paragraph is read.
           */}
          <h1 className="pse-display mt-5">Build mining capacity. Accrue campaign earnings. Settle at campaign close.</h1>
          <p className="pse-lead mt-5 max-w-[46ch]">
            PSEmine is a {PSEMINE_CONSTANTS.CAMPAIGN_DURATION_DAYS}-day mining campaign on BNB Smart Chain. Units are
            bought at a fixed price list, each adds a locked capacity per hour denominated in GBP, and settled campaign
            earnings are disbursed in BNB once the campaign ends.
          </p>

          <div className="pse-hero-cta mt-8">
            <CreateAccount />
            <a href="#how" className="pse-btn pse-btn--secondary pse-btn--lg">How it works</a>
            {/* A standalone navigation action beside the primary CTA, so it keeps a
                real 44px touch target on the small screens this product is built
                for rather than the inline-prose exception. */}
            <a href="#tools" className="pse-link pse-hero-link inline-flex min-h-[44px] items-center">See the four units</a>
          </div>

          {/* The product at a glance, in the product's own terms — the four
              decisions a reader has to make, answered before the fold. */}
          <dl className="pse-hero-meta mt-9">
            <div>
              <dt>Campaign</dt>
              <dd>{PSEMINE_CONSTANTS.CAMPAIGN_DURATION_DAYS} days</dd>
            </div>
            <div>
              <dt>Unit price</dt>
              <dd>{PRICE_RANGE}</dd>
            </div>
            <div>
              <dt>Capacity</dt>
              <dd>
                {RATE_RANGE}
                <span className="pse-hero-meta-unit">/hour</span>
              </dd>
            </div>
            <div>
              <dt>Settlement</dt>
              <dd>GBP → BNB</dd>
            </div>
          </dl>
        </Reveal>

        <PseAppWindow
          days={PSEMINE_CONSTANTS.CAMPAIGN_DURATION_DAYS}
          ceiling={PSEMINE_CONSTANTS.MAX_THEORETICAL_CAPACITY_GBP_PER_HOUR}
          toolCapacity={BUILD_TOOL_CAPACITY}
          referralCapacity={BUILD_REFERRAL_CAPACITY}
          build={EXAMPLE_BUILD}
          spine={SCENARIO_SPINE}
        />
      </section>

      {/* ── 01 · The purchase: reading column left, the rail right ───────── */}
      <section id="how" className="pse-section">
        <div className="pse-wrap">
          <Split object="end">
            <div className="pse-split-text">
              <PlateHead
                num="01"
                kicker="How it works"
                title="One chain, and four steps to enter it."
                meta="4 stages"
                lede="PSEmine runs on a single chain: units add capacity, capacity accrues through the campaign window, and settled earnings are paid out in BNB. Entering that chain is the four-step sequence below, and every step is written to your own account record."
              />
              <p className="pse-small pse-measure pse-split-aside">
                A purchase is a BNB transaction you send from your own wallet, at a quote you requested. The quote fixes
                the amount, the destination and its own time limit before you sign anything.
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
            Session units mine in fixed operating cycles and are restarted from the console, with a short delay before
            the next session begins. Holding the maximum of every tier gives{' '}
            {gbpHour(PSEMINE_CONSTANTS.MAX_TOOL_CAPACITY_GBP_PER_HOUR)} of unit capacity.
          </p>
        }
      >
        <ToolFamily tiers={TIERS} />
      </Section>

      {/* ── 03 · The capacity model: the chain across the top, the detail under it ── */}
      <section id="capacity" className="pse-section">
        <div className="pse-wrap">
          {/* The header moves out of the split so the chain can run the full
              width of the shell: the core product relationship deserves the
              page's own measure, not a column beside an instrument. */}
          <PlateHead
            num="03"
            kicker="Capacity model"
            title="Two sources of capacity. One ceiling."
            meta={`ceiling ${gbpHour(PSEMINE_CONSTANTS.MAX_THEORETICAL_CAPACITY_GBP_PER_HOUR)}`}
            lede="Capacity is a rate in GBP per hour, and it has a hard ceiling. Two things add it — the units you own, and the referrals that actually qualify — and both are computed server-side."
          />

          <div className="pse-section-object">
            <CapacityChain
              label="How units and qualified referrals become a payout"
              sourcesLabel="Capacity comes from"
              sources={CAPACITY_SOURCES}
              steps={CAPACITY_STEPS}
            />
          </div>

          <Split object="end" weight="even" className="mt-12">
            <div className="pse-split-text">
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
          phases={PHASES.map(p => ({ id: p.id, name: p.name, note: p.note, detail: p.detail, when: p.when }))}
        />

        {/* The three constraints that actually govern a campaign, instead of
            three labels that told the reader nothing they could use: a window
            that is dated from the campaign's launch rather than their own first
            purchase, a clock they do not control, and the fact that nothing
            accrues outside the window. */}
        <Reveal className="mt-8" delay={120}>
          <StatGrid cols={4}>
            <Stat
              label="Campaign length"
              value={PSEMINE_CONSTANTS.CAMPAIGN_DURATION_DAYS}
              unit="days"
              note="Dated from launch, not from your first purchase"
            />
            <Stat label="Clock" value="Server" note="Accrual is timestamped by the service, never by the browser" />
            <Stat label="Accrual" value="Live only" note="Nothing accrues before day 0 or after mining ends" />
            <Stat label="Payout" value="After review" note="Settled GBP is disbursed in BNB once approved" />
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
            lede="A purchase is a BNB transaction you send from your own wallet on BNB Smart Chain, at a quote you requested yourself. The unit's price is fixed in GBP; the quote states the exact BNB amount and how long it holds."
          />
          <Split object="start" className="pse-section-object">
            <PaymentConsole
              tier={TIERS[0]}
              network={PSEMINE_CONSTANTS.PAYMENT_NETWORK_NAME}
              asset="BNB"
              priceGBP={TOOLS[0].purchasePriceGBP}
              rateGBP={SCENARIO_BNB_GBP}
            />

            {/* The terms of a quote, as a quotation rather than as four stat
                blocks. The old column summarised what the scenario beside it
                already showed; this states the five rules a buyer is actually
                agreeing to, including the two failure modes the product records
                rather than hides. */}
            <Reveal delay={120} className="pse-quote">
              <div className="pse-quote-head">
                <span className="pse-quote-title">Quote terms</span>
                <span className="pse-quote-meta">What a quote fixes</span>
              </div>

              <dl className="pse-quote-rows">
                {QUOTE_RULES.map(rule => (
                  <div key={rule.term} className="pse-quote-row">
                    <dt className="pse-quote-term">{rule.term}</dt>
                    <dd className="pse-quote-rule">{rule.rule}</dd>
                  </div>
                ))}
              </dl>

              <p className="pse-quote-note">
                The purchase flow beside you shows how a quote works. Prices, rates and ownership limits are locked for
                the campaign, but the BNB amount of any purchase is issued per quote and expires with it — your own quote
                states the exact amount you would send.
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
        lede="Accrual becomes payable at settlement. The statement below shows where the denomination changes: GBP while the campaign runs, BNB when a settled balance is paid out."
      >
        <StatementPanel steps={SETTLEMENT} />

        <Reveal className="pse-terms mt-8" delay={80}>
          <div className="pse-terms-head">
            <span className="pse-micro">Payout terms</span>
            <span className="pse-micro">Settled balance → BNB</span>
          </div>
          <dl className="pse-terms-rows">
            {PAYOUT_TERMS.map(row => (
              <div key={row.term} className="pse-terms-row">
                <dt className="pse-terms-term">{row.term}</dt>
                <dd className="pse-terms-rule">{row.rule}</dd>
              </div>
            ))}
          </dl>
        </Reveal>

        <DocLine label="Governs a payout" docs={['payout-policy', 'risk']} />
      </Section>

      {/* ── 07 · Security: one relationship map, then the reading columns ── */}
      <Section
        id="security"
        num="07"
        kicker="Security and transparency"
        title="What is fixed, and what you can check."
        meta={`${TRUST.length} properties`}
        lede="Each of these is built into how PSEmine operates, and each one can be checked from your own account."
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
            {/* The closing section is one of the page's section headers, so it
                takes the section scale. It was the only heading set on the
                smaller .pse-h2 ramp, which made the final call to action the
                quietest heading on the page. */}
            <h2 className="pse-plate-title mt-4">Choose your first unit.</h2>
            <p className="pse-body mt-3">
              An account is free. You spend nothing until you choose a unit and pay for it from your own wallet — and the
              price, the hourly capacity and the ownership limit are shown before you sign anything.
            </p>
          </Reveal>
          {/*
           * The close states the price list.
           *
           * It used to draw one Elite unit beside three buttons of equal weight,
           * which is a picture and three choices rather than a decision. It now
           * carries the family it is inviting the reader to choose from — four
           * rows, each one a real link into sign-up, each stating its price, its
           * hourly capacity and its ownership limit — with ONE primary action
           * underneath it and the guide demoted to a text link. */}
          <Reveal className="pse-close-side" delay={100}>
            <div className="pse-pricelist">
              <span className="pse-pricelist-head">The price list · nothing else to buy</span>
              <ul className="pse-pricelist-rows">
                {TIERS.map(t => (
                  <li key={t.tier}>
                    <Link
                      to="/mine/signup"
                      className="pse-pricelist-row"
                      aria-label={`${t.name} — ${t.price}, ${t.rate}, up to ${t.limit} per account`}
                    >
                      <span className="pse-pricelist-art" aria-hidden="true">
                        <PseTierModule tier={t.tier} continuous={t.continuous} width={44} variant="mark" />
                      </span>
                      <span className="pse-pricelist-name">{t.name}</span>
                      <span className="pse-pricelist-rate">
                        {t.rate.replace('/hour', '')}
                        <span className="pse-pricelist-unit">/h</span>
                      </span>
                      <span className="pse-pricelist-price">{t.price}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            <div className="pse-close-actions">
              <div className="pse-hero-cta">
                <CreateAccount />
                <Link to="/mine/login" className="pse-btn pse-btn--secondary pse-btn--lg">Sign in</Link>
              </div>
              {/* The guide lives in the console now, and this page is public, so
                  this control points at the page's own explanation of the
                  campaign rather than at a route a signed-out reader cannot
                  open. It is a text link, not a third button: three equally
                  weighted controls are not a hierarchy. */}
              <a href="#campaign" className="pse-link inline-flex min-h-[44px] items-center">Read the campaign guide</a>
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
              <a className="pse-foot-link" href="#campaign">Campaign guide</a>
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
            PSEmine is a {PSEMINE_CONSTANTS.CAMPAIGN_DURATION_DAYS}-day campaign-based mining product on{' '}
            {PSEMINE_CONSTANTS.PAYMENT_NETWORK_NAME}. Units are bought at the published price list, each one adds a fixed
            capacity per hour in GBP, and settled campaign earnings are paid out in BNB under the campaign rules.
          </p>
          <p className="pse-small mt-3">
            <Link to={PSE_DOC_PATH.risk} className="pse-link inline-flex min-h-[44px] items-center">
              Read the risk disclosure
            </Link>
          </p>
        </div>
      </footer>
    </div>
  );
};

export default PSEMineLanding;
