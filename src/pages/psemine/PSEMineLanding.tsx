import React from 'react';
import { Link } from 'react-router-dom';
import { LOCKED_PSEMINE_TOOLS, PSEMINE_CONSTANTS } from '../../types/psemine';
import { gbp, gbpHour, usePseDocumentTitle } from '../../components/psemine/pseCore';
import { PSEmineLogo, PSEmineMark } from '../../components/psemine/PSEBrand';
import { PseFlowRail, PseTierMark } from '../../components/psemine/PseMechanism';

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
 *             transaction hash, payout record, activity history, account
 *             setting, console or admin control, internal architecture,
 *             entitlement/access explanation, fabricated activity or statistics
 *
 * THE PAGE READS NOTHING. It is deliberately static: it renders locked product
 * economics from src/types/psemine.ts (the frontend mirror of
 * api/psemine_core.py) and nothing else. There is no session, no campaign read
 * and no request, so no account state can leak into it — and the route guard
 * (`PSEMineEntry`) sends any signed-in visitor to the console before this page
 * is mounted at all. The only function of the page is to explain the product.
 *
 * COMPOSITION
 *   Ten sections, each answering one real question (what / how / tools /
 *   capacity / campaign / payment / settlement / security / FAQ / act). Rhythm
 *   comes from tonal bands, not borders. There are exactly TWO cards on the
 *   page: the hero product specimen and the tool family. Everything else is
 *   type, rules and band tone.
 *
 * WHERE THE NUMBERS COME FROM
 *   Prices, hourly rates, ownership limits and the capacity ceilings are the
 *   locked economics. No figure is invented, rounded up, projected or counted
 *   from a live record. There is no APY, no return, no count, no testimonial and
 *   no countdown urgency, because the product promises none of them.
 *
 * COPY RULE: the page describes the product, never the system behind it.
 */

const TOOLS = Object.values(LOCKED_PSEMINE_TOOLS).sort((a, b) => a.displayOrder - b.displayOrder);
const MAX_TIER_RATE = Math.max(...TOOLS.map(t => t.hourlyRateGBP));
const MIN_PRICE = Math.min(...TOOLS.map(t => t.purchasePriceGBP));
const MAX_PRICE = Math.max(...TOOLS.map(t => t.purchasePriceGBP));

const isContinuous = (t: (typeof TOOLS)[number]) => t.operating.model === 'continuous';

/* ── Section furniture ──────────────────────────────────────────────────── */

const Kicker: React.FC<{ num: string; text: string }> = ({ num, text }) => (
  <p className="pse-kicker">
    <span className="pse-kicker-num">{num}</span>
    <span className="pse-kicker-text">{text}</span>
  </p>
);

const Section: React.FC<{
  id: string;
  num: string;
  kicker: string;
  title: string;
  lede?: React.ReactNode;
  band?: 'tint' | 'ink' | 'none';
  wide?: boolean;
  children: React.ReactNode;
}> = ({ id, num, kicker, title, lede, band = 'none', wide = false, children }) => (
  <section
    id={id}
    className={`pse-section${band === 'tint' ? ' pse-band--tint' : ''}${band === 'ink' ? ' pse-band--ink' : ''}`}
  >
    <div className="pse-wrap">
      <div className={`pse-head${wide ? ' pse-head--wide' : ''}`}>
        <Kicker num={num} text={kicker} />
        <h2 className="pse-h2">{title}</h2>
        {lede && <p className="pse-body">{lede}</p>}
      </div>
      <div className="mt-9 md:mt-11">{children}</div>
    </div>
  </section>
);

/** A term/figure row. `value` is a node so a row can carry an asset marker. */
const Row: React.FC<{ term: string; value: React.ReactNode; muted?: boolean }> = ({ term, value, muted }) => (
  <div className="pse-row">
    <span className="pse-row-key">{term}</span>
    <span className={`pse-row-val${muted ? ' pse-row-val--muted' : ''}`}>{value}</span>
  </div>
);

/** The BNB asset marker. A word, a shape and a network — no logo plagiarism. */
const BnbAsset: React.FC = () => (
  <span className="pse-asset">
    <span className="pse-asset-dot" aria-hidden="true" />
    BNB · {PSEMINE_CONSTANTS.PAYMENT_NETWORK_NAME}
  </span>
);

/* ── The product specimen ───────────────────────────────────────────────── */

/**
 * A bespoke PSEmine interface specimen — deliberately not a dashboard
 * screenshot, and deliberately not a readout of anyone's account.
 *
 * It states TOOLS → CAPACITY → EARNINGS → CAMPAIGN → SETTLEMENT in one object
 * using the product's locked economics: the total capacity ceiling, the two real
 * sources that compose it (units and qualified referrals), the tier count, the
 * unit price range, the earnings denomination and the purchase/payout asset.
 *
 * It is labelled a specimen because it is not an account: there is no balance, no
 * holding, no activity, no position and no address anywhere inside it.
 */
const Specimen: React.FC = () => {
  const unitShare =
    (PSEMINE_CONSTANTS.MAX_TOOL_CAPACITY_GBP_PER_HOUR / PSEMINE_CONSTANTS.MAX_THEORETICAL_CAPACITY_GBP_PER_HOUR) * 100;

  return (
    <div className="pse-card pse-card--raised">
      <div className="pse-card-head">
        <span className="flex items-center gap-2.5">
          <PSEmineMark size={18} decorative />
          <span className="pse-h3">Capacity model</span>
        </span>
        <span className="pse-tag" data-tone="idle">
          <span className="pse-tag-dot" aria-hidden="true" />
          {PSEMINE_CONSTANTS.CAMPAIGN_DURATION_DAYS}-day campaign
        </span>
      </div>

      <div className="pse-card-body">
        <div className="pse-spec-block">
          <p className="pse-micro">Capacity ceiling</p>
          <p className="pse-metric">
            £{PSEMINE_CONSTANTS.MAX_THEORETICAL_CAPACITY_GBP_PER_HOUR.toFixed(2)}
            <span className="pse-metric-unit">/ hour</span>
          </p>
        </div>

        <div className="pse-spec-block">
          <p className="pse-micro">What the ceiling is made of</p>
          <div className="pse-bar pse-bar--split" aria-hidden="true">
            <span style={{ width: `${unitShare}%` }} />
            <span style={{ width: `${100 - unitShare}%` }} />
          </div>
          <div className="pse-legend">
            <span className="pse-legend-item">
              <span className="pse-legend-key" aria-hidden="true" />
              Units
              <span className="pse-legend-val">{gbpHour(PSEMINE_CONSTANTS.MAX_TOOL_CAPACITY_GBP_PER_HOUR)}</span>
            </span>
            <span className="pse-legend-item">
              <span className="pse-legend-key pse-legend-key--quiet" aria-hidden="true" />
              Referrals
              <span className="pse-legend-val">{gbpHour(PSEMINE_CONSTANTS.MAX_REFERRAL_CAPACITY_GBP_PER_HOUR)}</span>
            </span>
          </div>
        </div>

        <div className="pse-spec-block">
          <div className="pse-rows">
            <Row term="Mining units" value={`${TOOLS.length} tiers`} />
            <Row term="Unit price range" value={`${gbp(MIN_PRICE)} – ${gbp(MAX_PRICE)}`} />
            <Row term="Earnings denomination" value="GBP" />
            <Row term="Purchase and payout" value={<BnbAsset />} />
          </div>
        </div>
      </div>

      <div className="pse-card-foot">
        <p className="pse-small">
          Product specimen — PSEmine&rsquo;s locked economics, not your account.
        </p>
      </div>
    </div>
  );
};

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
          <p className="pse-body">{a}</p>
        </div>
      )}
    </div>
  );
};

/* ── The page ───────────────────────────────────────────────────────────── */

export const PSEMineLanding: React.FC = () => {
  usePseDocumentTitle('Campaign mining on BNB Smart Chain');

  /** One source for the primary call to action, so the bar and the closing band agree. */
  const CreateAccount: React.FC<{ size?: 'lg' | 'sm' }> = ({ size = 'lg' }) => (
    <Link to="/mine/signup" className={`pse-btn ${size === 'lg' ? 'pse-btn--lg' : 'pse-btn--sm'}`}>
      Create an account
    </Link>
  );

  return (
    <div className="pse pse-surface pse-plane min-h-screen">
      {/* ── Masthead ─────────────────────────────────────────────────────── */}
      <header className="pse-mast">
        <div className="pse-wrap pse-mast-inner">
          <Link to="/mine" aria-label="PSEmine home" className="inline-flex min-h-[44px] items-center">
            <PSEmineLogo size={26} decorative />
          </Link>

          <nav className="pse-mast-nav" aria-label="Page sections">
            <a className="pse-mast-link" href="#how">How it works</a>
            <a className="pse-mast-link" href="#tools">Tools</a>
            <a className="pse-mast-link" href="#capacity">Capacity</a>
            <a className="pse-mast-link" href="#payment">Payment</a>
            <a className="pse-mast-link" href="#faq">FAQ</a>
          </nav>

          <div className="pse-mast-actions">
            <Link to="/mine/login" className="pse-mast-link">Sign in</Link>
            <CreateAccount size="sm" />
          </div>
        </div>
      </header>

      {/* ── Hero: argument on the left, product specimen on the right ────── */}
      <section className="pse-wrap pse-hero">
        <div>
          <p className="pse-micro">Campaign-based mining capacity</p>
          <h1 className="pse-display mt-4">
            Capacity you hold for {PSEMINE_CONSTANTS.CAMPAIGN_DURATION_DAYS} days, settled and paid in BNB.
          </h1>
          <p className="pse-lead mt-5 max-w-[46ch]">
            PSEmine is a limited campaign with a fixed price list. Acquire units. Build capacity. Accrue campaign
            earnings. Receive your eligible payout after settlement.
          </p>

          <div className="pse-hero-cta mt-7">
            <CreateAccount />
            <a href="#how" className="pse-btn pse-btn--secondary pse-btn--lg">How it works</a>
          </div>

          <div className="pse-hero-meta mt-7">
            <span>{PSEMINE_CONSTANTS.CAMPAIGN_DURATION_DAYS}-day campaign</span>
            <span>{PSEMINE_CONSTANTS.PAYMENT_NETWORK_NAME}</span>
            <span>Earnings in GBP</span>
          </div>
        </div>

        <Specimen />
      </section>

      {/* ── 01 · What is PSEmine? ────────────────────────────────────────── */}
      <Section
        id="what"
        num="01"
        kicker="The product"
        title="What PSEmine is."
      >
        <div className="pse-split">
          <div className="space-y-4">
            <p className="pse-body pse-measure">
              PSEmine is a campaign instrument. You buy a mining unit once, with BNB, and that unit holds a fixed amount
              of capacity for the length of the campaign. Capacity is measured as a rate — pounds per hour — and it is
              what accrues your campaign earnings while the campaign is running.
            </p>
            <p className="pse-body pse-measure">
              There is no hardware to host and nothing to run on your own machine: the unit is a recorded right to a rate,
              the accrual is calculated by the service, and the balance is settled and paid out in BNB when the campaign
              closes. Prices, hourly rates and ownership limits are fixed, and all three are shown before you pay.
            </p>
          </div>

          <div className="pse-rows">
            <Row term="Campaign length" value={`${PSEMINE_CONSTANTS.CAMPAIGN_DURATION_DAYS} days`} />
            <Row term="Earnings denomination" value="GBP" />
            <Row term="Purchase and payout asset" value="BNB" />
            <Row term="Network" value={PSEMINE_CONSTANTS.PAYMENT_NETWORK_NAME} />
            <Row term="Mining units available" value={`${TOOLS.length} tiers`} />
            <Row term="Capacity ceiling" value={gbpHour(PSEMINE_CONSTANTS.MAX_THEORETICAL_CAPACITY_GBP_PER_HOUR)} />
          </div>
        </div>
      </Section>

      {/* ── 02 · How does it work? ───────────────────────────────────────── */}
      <Section
        id="how"
        num="02"
        kicker="The mechanism"
        band="ink"
        wide
        title="Six stages, in order."
        lede="Every stage below happens against an account record. This is a schematic of the real mechanism, not a readout: it carries no live figure and no progress."
      >
        <PseFlowRail />
      </Section>

      {/* ── 03 · What are the tools? ─────────────────────────────────────── */}
      <Section
        id="tools"
        num="03"
        kicker="The tool family"
        wide
        title="Four tiers, one locked price list."
        lede="One product line, four units. Each tier has a fixed price, a fixed capacity per hour and an ownership limit. You pay the price in BNB at the rate quoted when you request the quote, so a unit's price never drifts with the market."
      >
        <div className="pse-tools">
          <div className="pse-tools-head">
            <span className="pse-cell-label pse-tools-head-cell">Unit</span>
            <span className="pse-cell-label">Capacity</span>
            <span className="pse-cell-label">Price</span>
            <span className="pse-cell-label">Ownership limit</span>
          </div>

          {TOOLS.map(tool => (
            <article key={tool.id} className="pse-tool">
              <div className="pse-tool-id">
                <PseTierMark tier={tool.tier} continuous={isContinuous(tool)} />
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                    <span className="pse-h3">{tool.name}</span>
                    <span className="pse-tag" data-tone="idle">
                      <span className="pse-tag-dot" aria-hidden="true" />
                      {isContinuous(tool) ? 'Continuous' : 'Session'}
                    </span>
                  </div>
                  <p className="pse-micro mt-1">Tier {tool.tier}</p>
                  <p className="pse-tool-tagline">{tool.tagline}</p>
                </div>
              </div>

              <div className="pse-tool-cap">
                <span className="pse-cell-label">Capacity</span>
                <p className="pse-tool-rate">
                  {gbpHour(tool.hourlyRateGBP).replace('/hour', '')}
                  <span className="pse-tool-rate-unit"> /hour</span>
                </p>
                <div className="pse-bar mt-2" aria-hidden="true">
                  <span style={{ width: `${Math.round((tool.hourlyRateGBP / MAX_TIER_RATE) * 100)}%` }} />
                </div>
              </div>

              <div className="pse-tool-price">
                <span className="pse-cell-label">Price</span>
                <span className="pse-cell-value">{gbp(tool.purchasePriceGBP)}</span>
              </div>

              <div className="pse-tool-limit">
                <span className="pse-cell-label">Ownership limit</span>
                <span className="pse-cell-value">{tool.maxPerUser} per account</span>
              </div>
            </article>
          ))}
        </div>

        <p className="pse-small mt-6 pse-measure">
          Session units mine in fixed operating cycles and stop between them until they are restarted — nothing accrues
          between sessions, and a restart takes a short delay before the next session begins. The Elite unit runs
          continuously. Holding the maximum of every tier gives{' '}
          {gbpHour(PSEMINE_CONSTANTS.MAX_TOOL_CAPACITY_GBP_PER_HOUR)} of unit capacity.
        </p>
      </Section>

      {/* ── 04 · How does capacity work? ─────────────────────────────────── */}
      <Section
        id="capacity"
        num="04"
        kicker="Capacity model"
        band="tint"
        wide
        title="Capacity is a rate, and it has a hard ceiling."
        lede="Two sources add capacity: the units you own, and referrals that actually qualify. Both are bounded, and both are computed server-side."
      >
        <div className="pse-split">
          <div className="space-y-5">
            <p className="pse-micro">Where capacity comes from</p>
            <div className="pse-rows">
              <Row
                term="Units · up to the ownership limit of every tier"
                value={gbpHour(PSEMINE_CONSTANTS.MAX_TOOL_CAPACITY_GBP_PER_HOUR)}
              />
              <Row
                term={`Referrals · ${gbpHour(PSEMINE_CONSTANTS.REFERRAL_BONUS_GBP_PER_HOUR)} each, max ${PSEMINE_CONSTANTS.MAX_QUALIFIED_REFERRALS}`}
                value={gbpHour(PSEMINE_CONSTANTS.MAX_REFERRAL_CAPACITY_GBP_PER_HOUR)}
              />
              <Row term="Total ceiling" value={gbpHour(PSEMINE_CONSTANTS.MAX_THEORETICAL_CAPACITY_GBP_PER_HOUR)} />
            </div>
            <p className="pse-small pse-measure">
              Referral capacity accrues only while you have a unit actually operating, and no capacity is credited
              retroactively for a referral that qualifies late.
            </p>
          </div>

          <div className="space-y-5">
            <p className="pse-micro">How a referral qualifies</p>
            <ol className="pse-ladder">
              {[
                ['Registered', 'Signed up with your referral code. Nothing is credited at this stage.'],
                ['Wallet connected', 'Connected a BNB Smart Chain wallet to their own account.'],
                ['Unit purchased', 'Bought a mining unit with their own funds.'],
                ['Mining active', 'The unit is operating inside the campaign.'],
                ['Qualified', 'All four stages verified — capacity is added from here, not before.'],
              ].map(([name, note], i) => (
                <li key={name} className="pse-ladder-step">
                  <span className="pse-ladder-num">{String(i + 1).padStart(2, '0')}</span>
                  <span>
                    <span className="pse-ladder-name">{name}</span>
                    <span className="pse-ladder-note block">{note}</span>
                  </span>
                </li>
              ))}
            </ol>
          </div>
        </div>
      </Section>

      {/* ── 05 · What happens during the campaign? ───────────────────────── */}
      <Section
        id="campaign"
        num="05"
        kicker="Campaign lifecycle"
        wide
        title={`A ${PSEMINE_CONSTANTS.CAMPAIGN_DURATION_DAYS}-day window with a defined end.`}
        lede="Mining is only live while the campaign is. Each phase changes what happens to accrual, and the record of it is kept."
      >
        <ol className="pse-ladder" aria-label="The five phases of a PSEmine campaign">
          {[
            ['Launch', 'The campaign opens. Mining units become available to buy.'],
            ['Mining', 'Units operate and capacity accrues against a server-side checkpoint.'],
            ['Settlement', 'Accrual stops at the end of the window. Final balances are computed.'],
            ['Payout', 'Settled GBP is disbursed in BNB to payout wallets, after review.'],
            ['Closed', 'The campaign is finished. Records stay available on the account.'],
          ].map(([name, note], i) => (
            <li key={name} className="pse-ladder-step">
              <span className="pse-ladder-num">{String(i + 1).padStart(2, '0')}</span>
              <span>
                <span className="pse-ladder-name">{name}</span>
                <span className="pse-ladder-note block">{note}</span>
              </span>
            </li>
          ))}
        </ol>

        <p className="pse-small mt-7 pse-measure">
          A campaign is dated from its start, and the campaign clock is the server&apos;s — never a browser&apos;s. If a
          campaign is paused, accrual stops for every unit at once and resumes when the campaign does; the window of live
          mining is recorded server-side, so nothing is credited for time that did not run.
        </p>
      </Section>

      {/* ── 06 · How does BNB payment work? ──────────────────────────────── */}
      <Section
        id="payment"
        num="06"
        kicker="Payment"
        band="tint"
        wide
        title="You pay in BNB, at a quoted rate."
        lede="There is no card and no fiat on-ramp. A purchase is a BNB transaction you send from your own wallet on BNB Smart Chain."
      >
        <div className="pse-split">
          <div className="space-y-5">
            <p className="pse-micro">Buying a unit</p>
            <ol className="pse-ladder">
              {[
                ['Request a quote', "The GBP price is fixed and converted to a BNB amount at that quote's rate. The quote is time-limited."],
                ['Pay the quoted amount', 'You send that exact amount from your own wallet to the address that quote prints for you.'],
                ['On-chain verification', 'The payment is verified on the chain: the amount, the payer and the destination are all checked.'],
                ['Activation', 'A verified purchase activates the unit, and its hourly capacity is added to your account.'],
              ].map(([name, note], i) => (
                <li key={name} className="pse-ladder-step">
                  <span className="pse-ladder-num">{String(i + 1).padStart(2, '0')}</span>
                  <span>
                    <span className="pse-ladder-name">{name}</span>
                    <span className="pse-ladder-note block">{note}</span>
                  </span>
                </li>
              ))}
            </ol>
          </div>

          <div className="space-y-5">
            <p className="pse-micro">What a quote gives you</p>
            <div className="pse-rows">
              <Row term="Price" value="Fixed in GBP" />
              <Row term="Amount to send" value="Exact BNB at the quoted rate" />
              <Row term="Time limit" value="The quote itself shows what is left" />
              <Row term="Where it is sent" value="The address printed on that quote" />
              <Row term="Asset and network" value={<BnbAsset />} />
            </div>
            <p className="pse-small pse-measure">
              Every paying action happens on your own wallet and on a live quote only. A purchase that is never paid, is
              paid late, or is paid an incorrect amount is recorded as expired or underpaid and reviewed — never
              auto-corrected by the browser.
            </p>
          </div>
        </div>
      </Section>

      {/* ── 07 · How does settlement and payout work? ────────────────────── */}
      <Section
        id="payout"
        num="07"
        kicker="Settlement and payout"
        wide
        title="Earnings are settled in GBP, then paid in BNB."
        lede="Accrual becomes payable only at settlement. Until then it is a running record, not a balance that can be moved."
      >
        <div className="pse-split">
          <div className="pse-rows">
            <Row term="What accrues" value="GBP, per hour of live capacity" />
            <Row term="Where it is computed" value="Server-side, against a checkpoint" />
            <Row term="When it settles" value="After the campaign ends" />
            <Row term="How it is paid" value="BNB on BNB Smart Chain" />
            <Row term="Before it is sent" value="Payout review" />
            <Row term="Destination" value="The payout wallet on your account" />
          </div>

          <div className="space-y-5">
            <p className="pse-micro">What to know before settlement</p>
            <ul className="pse-body space-y-3">
              <li>
                · Set your payout wallet before the campaign&apos;s wallet-change cutoff. After it, the address on file is
                the one that is paid — the cutoff exists so a settled balance cannot be redirected.
              </li>
              <li>
                · Campaign earnings are not withdrawable mid-campaign. Accrual becomes payable only once settlement
                finalises it.
              </li>
              <li>
                · Both the purchase and the payout are written to the chain, so each direction is checkable rather than
                taken on trust.
              </li>
            </ul>
          </div>
        </div>
      </Section>

      {/* ── 08 · Security and transparency ──────────────────────────────── */}
      <Section
        id="security"
        num="08"
        kicker="Security and transparency"
        band="tint"
        wide
        title="What is fixed, and what you can check."
        lede="These are properties of the product, not claims about it — each one holds whether or not you take our word for it."
      >
        <div className="pse-split">
          <div className="space-y-4">
            <p className="pse-body pse-measure">
              You keep your own keys. PSEmine never takes custody of funds, and never asks you to send anything anywhere
              other than the address printed on a live quote. A unit purchase goes from your wallet to the
              campaign&apos;s address for that purchase, and a payout goes to the payout wallet you set.
            </p>
            <p className="pse-body pse-measure">
              Prices, hourly rates, ownership limits and the capacity ceiling are locked: they are the same for every
              account and do not move with the market or with how much anyone holds. A unit&apos;s hourly capacity is
              confirmed when the purchase activates, and every change to an account is written to that account&apos;s
              activity record.
            </p>
          </div>

          <div className="pse-rows">
            <Row term="Accrual and balances" value="Computed server-side" muted />
            <Row term="Unit prices and rates" value="Locked at activation" muted />
            <Row term="Custody of your funds" value="None — your wallet stays yours" muted />
            <Row term="Both directions" value="Recorded on-chain" muted />
            <Row term="Account changes" value="Written to the activity record" muted />
            <Row term="Payout destination" value="Yours, with a change cutoff" muted />
          </div>
        </div>
      </Section>

      {/* ── 09 · FAQ ─────────────────────────────────────────────────────── */}
      <Section id="faq" num="09" kicker="Questions" wide title="The questions this product actually raises.">
        <div className="pse-faq pse-measure-tight" style={{ maxWidth: '78ch' }}>
          {FAQ.map((item, i) => (
            <FaqItem key={item.q} q={item.q} a={item.a} index={i} />
          ))}
        </div>
      </Section>

      {/* ── 10 · Call to action ──────────────────────────────────────────── */}
      <section className="pse-section pse-band--ink">
        <div className="pse-wrap pse-close">
          <div className="max-w-[52ch]">
            <p className="pse-micro">Open an account</p>
            <h2 className="pse-h2 mt-3">Choose your first unit.</h2>
            <p className="pse-body mt-3">
              An account is free. You spend nothing until you choose a unit and pay for it from your own wallet — and the
              price, the hourly capacity and the ownership limit are shown before you sign anything.
            </p>
          </div>
          <div className="pse-hero-cta shrink-0">
            <CreateAccount />
            <Link to="/mine/login" className="pse-btn pse-btn--secondary pse-btn--lg">Sign in</Link>
            <Link to="/mine/guide" className="pse-btn pse-btn--secondary pse-btn--lg">Read the guide</Link>
          </div>
        </div>
      </section>

      {/* ── Footer ───────────────────────────────────────────────────────── */}
      <footer className="pse-foot">
        <div className="pse-wrap pse-foot-grid">
          <div className="space-y-3">
            <PSEmineLogo size={24} withSub />
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
