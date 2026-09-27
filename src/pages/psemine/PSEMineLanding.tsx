import React from 'react';
import { Link } from 'react-router-dom';
import { usePSEMineAuth } from '../../contexts/usePSEMineAuth';
import { LOCKED_PSEMINE_TOOLS, PSEMINE_CONSTANTS } from '../../types/psemine';
import {
  campaignStatusView, gbp, gbpHour, toDateSafe, useCampaignClock, usePseDocumentTitle,
} from '../../components/psemine/pseCore';
import { PSEmineLogo, PSEmineMark } from '../../components/psemine/PSEBrand';
import { PseFlowRail } from '../../components/psemine/PseMechanism';
import { usePublicCampaign, type PublicCampaignState } from '../../components/psemine/psePublicCampaign';
import { PseLoadFailure, PseLoader, PseUnavailable } from '../../components/psemine/PseLoader';

/**
 * PSEmine public page — `/mine`.
 *
 * WHAT THIS PAGE HAS TO DO
 * ------------------------
 * A visitor has never heard of PSEmine. Within a few seconds the page must state,
 * truthfully: what PSEmine is, how the campaign works, what a mining tool is, how
 * capacity is bounded, how long the campaign runs, how a BNB purchase happens,
 * where earnings come from, and how settlement and payout work. Everything else is
 * noise, so anything decorative has been removed rather than styled.
 *
 * HOW IT IS PRESENTED
 * -------------------
 * As a documented instrument: numbered clauses separated by rules, a measured
 * column, and every figure set in the tabular figure family. See
 * DESIGN_SYSTEM.md for the rules and src/styles/psemine.css for the layer.
 *
 * WHERE THE NUMBERS COME FROM
 * ---------------------------
 *   • campaign status, duration and the purchase/mining/referral flags — the
 *     server's public campaign contract (usePublicCampaign → the real endpoint).
 *     Nothing is defaulted in: if the read fails the page says so and offers a
 *     retry.
 *   • tool prices, hourly rates, ownership limits and the capacity ceilings — the
 *     locked economics in src/types/psemine.ts, the frontend mirror of
 *     api/psemine_core.py. No figure here is invented, rounded up, or projected,
 *     and there is no APY, count, testimonial or countdown, because the product
 *     promises none of them.
 *
 * COPY RULE: the page describes the product, never the system behind it. It does
 * not explain how accounts, access or routing are arranged; a visitor came here
 * to understand an earning instrument, not an architecture.
 */

const TOOLS = Object.values(LOCKED_PSEMINE_TOOLS).sort((a, b) => a.displayOrder - b.displayOrder);
const MAX_TIER_RATE = Math.max(...TOOLS.map(t => t.hourlyRateGBP));
const PRICE_FROM = Math.min(...TOOLS.map(t => t.purchasePriceGBP));
const PRICE_TO = Math.max(...TOOLS.map(t => t.purchasePriceGBP));

/* ── Page furniture ─────────────────────────────────────────────────────── */

const Kicker: React.FC<{ index: string; text: string }> = ({ index, text }) => (
  <div className="pse-kicker">
    <span className="pse-kicker-index">{index}</span>
    <span className="pse-kicker-text">{text}</span>
  </div>
);

const Section: React.FC<{
  id: string;
  index: string;
  kicker: string;
  title: string;
  lede?: React.ReactNode;
  children: React.ReactNode;
}> = ({ id, index, kicker, title, lede, children }) => (
  <section id={id} className="pse-section">
    <div className="pse-wrap">
      <Kicker index={index} text={kicker} />
      <div className="mt-6 max-w-3xl space-y-3 md:mt-8">
        <h2 className="pse-h2">{title}</h2>
        {lede && <p className="pse-lead">{lede}</p>}
      </div>
      <div className="mt-8 md:mt-10">{children}</div>
    </div>
  </section>
);

/* ── FAQ ────────────────────────────────────────────────────────────────── */

const FAQ: ReadonlyArray<{ q: string; a: React.ReactNode }> = [
  {
    q: 'What is PSEmine, in one paragraph?',
    a: (
      <>
        PSEmine is a limited, campaign-based mining product. You buy mining tools with BNB; each tool adds a fixed
        capacity per hour denominated in GBP; that capacity accrues campaign earnings while the campaign runs; and the
        earnings you have accrued are settled and paid out in BNB after the campaign ends. Nothing is mined on hardware
        you own or host: a tool is a campaign instrument with a locked price, a locked hourly capacity and an ownership
        limit, and the accrual itself is calculated by the PSEmine service.
      </>
    ),
  },
  {
    q: 'What exactly do I own?',
    a: (
      <>
        A recorded right to a tool's hourly capacity for the duration of the campaign. Ownership is per account and per
        tool type, capped at {TOOLS.map(t => `${t.maxPerUser} ${t.name}`).join(', ')}. A tool's price and its hourly
        capacity are fixed in the product's locked economics, and both are shown before you pay.
      </>
    ),
  },
  {
    q: 'How does the campaign timeline run?',
    a: (
      <>
        The campaign runs for {PSEMINE_CONSTANTS.CAMPAIGN_DURATION_DAYS} days from its start date. While it is active,
        capacity accrues. When it ends, accrual stops, final balances are computed for settlement, and settled GBP is
        disbursed in BNB to the payout wallet on your account. If the campaign is paused, nothing accrues during the
        pause — the record of exactly when mining was live is kept server-side.
      </>
    ),
  },
  {
    q: 'How does a BNB purchase actually work?',
    a: (
      <>
        You request a quote for a tool. The price is fixed in GBP and converted to a BNB amount at the rate of that
        quote, and the quote is time-limited — the time left is shown on it. You then pay that exact amount from your
        own wallet on {PSEMINE_CONSTANTS.PAYMENT_NETWORK_NAME} to the receiving address the quote shows you. Once the
        transaction is confirmed on-chain it is verified and the tool is activated. If a quote expires, or a payment
        does not match it, the purchase is recorded as expired or underpaid rather than silently absorbed.
      </>
    ),
  },
  {
    q: 'What happens when a tool stops mining?',
    a: (
      <>
        Starter, Builder and Advanced tools mine in fixed sessions and require a manual restart between them, with a
        short delay before the next session begins. Between sessions that tool accrues nothing. The Elite tool mines
        continuously while the campaign is active and never needs a restart. No tool earns anything while the campaign
        itself is paused or ended.
      </>
    ),
  },
  {
    q: 'How is capacity capped?',
    a: (
      <>
        Tool capacity tops out at {gbpHour(PSEMINE_CONSTANTS.MAX_TOOL_CAPACITY_GBP_PER_HOUR)} once you hold the maximum
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
        Only at the fifth and last stage: registered, wallet connected, tool purchased, mining active, qualified. Every
        stage is verified against the referral's own account records, and the capacity is added from the moment of
        qualification — never retroactively, and never for a referral that does not reach it.
      </>
    ),
  },
  {
    q: 'How does payout work?',
    a: (
      <>
        Accrued GBP is campaign earnings, not a wallet balance. After settlement they are disbursed in BNB to the payout
        wallet configured on your account, and each payout passes a review before it is sent. Set your payout wallet
        before settlement: there is a cutoff for wallet changes, after which the address on file at settlement is the
        one that is paid. Every payment — your purchase and your payout — carries a BNB Smart Chain transaction hash you
        can check on BscScan.
      </>
    ),
  },
  {
    q: 'What is PSEmine not?',
    a: (
      <>
        It is not a promise of profit, a fixed APY, an investment product or a hardware sale. Hourly capacity is a
        campaign rate in GBP; campaign earnings depend on the campaign actually running for its window and on your tools
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

/* ── Campaign state, as the server reports it ───────────────────────────── */

/**
 * The campaign's real position, or the honest statement that it could not be
 * read. This is the only place the page talks about "now": it renders the
 * server's status and derives a day number only when the campaign record
 * actually carries a start date.
 */
const CampaignStrip: React.FC<{ state: PublicCampaignState }> = ({ state }) => {
  const { campaign, loading, refreshing, error, refresh } = state;
  const clock = useCampaignClock(campaign);

  if (loading) {
    return (
      <div className="pse-panel pse-panel-body">
        <PseLoader variant="inline" stage="campaign" />
      </div>
    );
  }

  // A service that did not answer and a refusal are different states, and the page
  // says which one happened. Either way it states nothing it could not read.
  if (error) {
    return error.retryable ? (
      <PseUnavailable what="the campaign record" onRetry={() => void refresh()} retrying={refreshing} />
    ) : (
      <PseLoadFailure error={error} onRetry={() => void refresh()} retrying={refreshing} />
    );
  }

  const status = campaignStatusView(campaign?.status);
  const purchaseOpen = campaign?.purchaseEnabled === true;
  const fmt = (v: unknown) =>
    v ? toDateSafe(v)?.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) ?? null : null;
  const startIso = fmt(campaign?.startAt);
  const endIso = fmt(campaign?.endAt);

  return (
    <div className="pse-panel">
      <div className="pse-panel-head">
        <span className="pse-tag" data-tone={status.live ? 'live' : 'idle'}>
          <span className="pse-tag-dot" aria-hidden="true" />
          {status.label}
        </span>
        <span className="pse-micro">{campaign?.name || 'PSEmine campaign'}</span>
      </div>
      <div className="pse-panel-body">
        <div className="pse-kv">
          <span className="pse-kv-key">Position</span>
          <span className="pse-kv-val">
            {clock.dayNumber !== null ? `Day ${clock.dayNumber} of ${clock.totalDays}` : `${clock.totalDays}-day campaign`}
          </span>
        </div>
        <div className="pse-kv">
          <span className="pse-kv-key">Time remaining</span>
          <span className="pse-kv-val">{clock.daysLeft !== null ? `${clock.daysLeft} days` : 'Not reported'}</span>
        </div>
        <div className="pse-kv">
          <span className="pse-kv-key">Runs</span>
          <span className="pse-kv-val">{startIso && endIso ? `${startIso} → ${endIso}` : 'Dates not reported'}</span>
        </div>
        <div className="pse-kv">
          <span className="pse-kv-key">Tool purchases</span>
          <span className="pse-kv-val">{purchaseOpen ? 'Open' : 'Closed'}</span>
        </div>
        <div className="pse-kv">
          <span className="pse-kv-key">Settlement &amp; payout</span>
          <span className="pse-kv-val">{status.detail}</span>
        </div>
        <div className="pse-kv">
          <span className="pse-kv-key">Payment asset</span>
          <span className="pse-kv-val">
            {campaign?.paymentAsset || 'BNB'} · {campaign?.paymentNetwork || PSEMINE_CONSTANTS.PAYMENT_NETWORK_NAME}
          </span>
        </div>
      </div>
    </div>
  );
};

/* ── The page ───────────────────────────────────────────────────────────── */

export const PSEMineLanding: React.FC = () => {
  const { currentUser, loading: authLoading } = usePSEMineAuth();
  // One read for the whole page: the hero's campaign strip and every figure
  // derived from the campaign record share this single request.
  const campaignState = usePublicCampaign();
  const { campaign } = campaignState;

  usePseDocumentTitle('Campaign mining on BNB Smart Chain');

  const clock = useCampaignClock(campaign);
  const chainId = campaign?.paymentChainId ?? PSEMINE_CONSTANTS.DEFAULT_BSC_CHAIN_ID;
  const receiver = campaign?.receiverWalletAddress || PSEMINE_CONSTANTS.DEFAULT_RECEIVER_WALLET;
  const campaignLive = campaignStatusView(campaign?.status).live;

  /** Primary call to action — one source, so the masthead and the closing band agree. */
  const Cta: React.FC<{ size?: 'lg' | 'sm' }> = ({ size = 'lg' }) =>
    authLoading ? (
      <span className={`pse-btn pse-btn-quiet ${size === 'sm' ? 'pse-btn-sm' : ''}`} aria-busy="true">
        Checking session…
      </span>
    ) : currentUser ? (
      <Link to="/mine/dashboard" className={`pse-btn ${size === 'sm' ? 'pse-btn-sm' : ''}`}>
        Open the console
      </Link>
    ) : (
      <Link to="/mine/signup" className={`pse-btn ${size === 'sm' ? 'pse-btn-sm' : ''}`}>
        <span className="hidden sm:inline">Create a PSEmine account</span>
        <span className="sm:hidden">Create account</span>
      </Link>
    );

  return (
    <div className="pse pse-surface min-h-screen">
      {/* ── Masthead ─────────────────────────────────────────────────────── */}
      <header className="pse-mast">
        <div className="pse-wrap pse-mast-row">
          <Link to="/mine" aria-label="PSEmine home" className="inline-flex min-h-[44px] items-center">
            <PSEmineLogo size={28} live={campaignLive} decorative />
          </Link>

          <nav className="pse-mast-nav" aria-label="Page sections">
            <a className="pse-mast-link" href="#mechanism">How it works</a>
            <a className="pse-mast-link" href="#tools">Tools</a>
            <a className="pse-mast-link" href="#capacity">Capacity</a>
            <a className="pse-mast-link" href="#money">Money</a>
            <a className="pse-mast-link" href="#faq">FAQ</a>
          </nav>

          <div className="pse-mast-actions">
            {!currentUser && (
              <Link to="/mine/login" className="pse-mast-link hidden sm:inline-flex">
                Sign in
              </Link>
            )}
            <Cta size="sm" />
          </div>
        </div>
      </header>

      {/* ── Hero ─────────────────────────────────────────────────────────── */}
      <section className="pse-wrap pse-hero">
        <div className="space-y-7">
          <p className="pse-micro">Mining campaign · BNB Smart Chain</p>
          <h1 className="pse-display">
            Mining capacity, held for {clock.totalDays} days, settled in GBP and paid out in BNB.
          </h1>
          <p className="pse-lead max-w-2xl">
            PSEmine is a limited campaign with a fixed price list. You buy mining tools with BNB; each tool adds a fixed
            capacity per hour denominated in GBP; that capacity accrues campaign earnings while the campaign runs; and
            the earnings are settled and paid out in BNB when it ends. Prices, hourly rates and ownership limits are
            fixed, and all three are shown before you pay.
          </p>

          <div className="pse-hero-actions">
            <Cta />
            <a href="#mechanism" className="pse-btn pse-btn-quiet">
              How the campaign works
            </a>
          </div>

          <dl className="pse-hero-facts max-w-xl">
            <div className="pse-hero-fact">
              <dt>Capacity ceiling per hour</dt>
              <dd>{gbpHour(PSEMINE_CONSTANTS.MAX_THEORETICAL_CAPACITY_GBP_PER_HOUR)}</dd>
            </div>
            <div className="pse-hero-fact">
              <dt>Mining tools</dt>
              <dd>
                {TOOLS.length} tiers · {gbp(PRICE_FROM)}–{gbp(PRICE_TO)}
              </dd>
            </div>
            <div className="pse-hero-fact">
              <dt>Earnings denomination</dt>
              <dd>GBP · settled after the campaign</dd>
            </div>
            <div className="pse-hero-fact">
              <dt>Purchase and payout asset</dt>
              <dd>
                <span className="pse-asset">
                  <span className="pse-asset-dot" aria-hidden="true" />
                  BNB · chain {chainId}
                </span>
              </dd>
            </div>
          </dl>
        </div>

        {/* The campaign's real position, or an honest statement that it is unread. */}
        <div className="space-y-3">
          <p className="pse-micro">Reported by PSEmine</p>
          <CampaignStrip state={campaignState} />
          <p className="pse-small">
            Campaign state, day and remaining time are read from the live campaign record. Nothing on this page is a
            projection of earnings.
          </p>
        </div>
      </section>

      {/* ── 01 · Mechanism ───────────────────────────────────────────────── */}
      <section id="mechanism" className="pse-section">
        <div className="pse-wrap">
          <Kicker index="01" text="The mechanism" />
          <div className="mt-6 max-w-3xl space-y-3 md:mt-8">
            <h2 className="pse-h2">Six stages, in order — tools to payout.</h2>
            <p className="pse-lead">
              Every stage below happens against your account record. The instrument is a schematic of the real
              mechanism, not a readout: it carries no live figure and no progress.
            </p>
          </div>
          <div className="mt-8 md:mt-10">
            <PseFlowRail />
          </div>
        </div>
      </section>

      {/* ── 02 · Tools ───────────────────────────────────────────────────── */}
      <Section
        id="tools"
        index="02"
        kicker="Mining tools"
        title="Four tiers of capacity, one locked price list."
        lede={
          <>
            Each tier has a fixed price in GBP, a fixed capacity per hour and an ownership limit. You pay the price in
            BNB at the rate quoted when you request the quote, so the tool price never drifts with the market.
          </>
        }
      >
        <div className="pse-tools">
          {TOOLS.map(tool => (
            <article key={tool.id} className="pse-tool">
              <div className="pse-tool-top">
                <div>
                  <p className="pse-micro">Tier {tool.tier}</p>
                  <h3 className="pse-h3 mt-1">{tool.name}</h3>
                </div>
                <span className="pse-tag" data-tone={tool.operating.model === 'continuous' ? 'live' : 'idle'}>
                  <span className="pse-tag-dot" aria-hidden="true" />
                  {tool.operating.model === 'continuous' ? 'Continuous' : 'Session'}
                </span>
              </div>

              <div>
                <p className="pse-tool-rate">
                  {gbpHour(tool.hourlyRateGBP).replace('/hour', '')}
                  <span className="pse-tool-rate-unit"> /hour capacity</span>
                </p>
                <div className="pse-meter mt-3" aria-hidden="true">
                  <span style={{ width: `${Math.round((tool.hourlyRateGBP / MAX_TIER_RATE) * 100)}%` }} />
                </div>
              </div>

              <dl className="mt-auto">
                <div className="pse-kv">
                  <dt className="pse-kv-key">Price</dt>
                  <dd className="pse-kv-val">{gbp(tool.purchasePriceGBP)}</dd>
                </div>
                <div className="pse-kv">
                  <dt className="pse-kv-key">Ownership limit</dt>
                  <dd className="pse-kv-val">{tool.maxPerUser} per account</dd>
                </div>
                <div className="pse-kv">
                  <dt className="pse-kv-key">Operation</dt>
                  <dd className="pse-kv-val">{tool.operating.model === 'continuous' ? 'Continuous' : 'Session'}</dd>
                </div>
              </dl>
            </article>
          ))}
        </div>

        <p className="pse-small mt-6 max-w-3xl">
          Session tools mine in fixed operating cycles and stop between them until they are restarted — nothing accrues
          between sessions, and a restart takes a short delay before the next session begins. Holding the maximum of
          every tier gives {gbpHour(PSEMINE_CONSTANTS.MAX_TOOL_CAPACITY_GBP_PER_HOUR)} of tool capacity.
        </p>
      </Section>

      {/* ── 03 · Capacity ────────────────────────────────────────────────── */}
      <Section
        id="capacity"
        index="03"
        kicker="Capacity model"
        title="Capacity is a rate, and it has a hard ceiling."
        lede="Two sources add capacity: the tools you own, and referrals that actually qualify. Both are bounded, and both are computed server-side."
      >
        <div className="pse-capacity">
          <div className="space-y-4">
            <p className="pse-micro">Where capacity comes from</p>
            <div className="pse-panel pse-panel-body">
              <div className="pse-kv">
                <span className="pse-kv-key">Tools · up to the ownership limit of every tier</span>
                <span className="pse-kv-val">{gbpHour(PSEMINE_CONSTANTS.MAX_TOOL_CAPACITY_GBP_PER_HOUR)}</span>
              </div>
              <div className="pse-kv">
                <span className="pse-kv-key">
                  Referrals · {gbpHour(PSEMINE_CONSTANTS.REFERRAL_BONUS_GBP_PER_HOUR)} each, max{' '}
                  {PSEMINE_CONSTANTS.MAX_QUALIFIED_REFERRALS}
                </span>
                <span className="pse-kv-val">{gbpHour(PSEMINE_CONSTANTS.MAX_REFERRAL_CAPACITY_GBP_PER_HOUR)}</span>
              </div>
              <div className="pse-kv">
                <span className="pse-kv-key">Total ceiling</span>
                <span className="pse-kv-val">{gbpHour(PSEMINE_CONSTANTS.MAX_THEORETICAL_CAPACITY_GBP_PER_HOUR)}</span>
              </div>
            </div>
            <p className="pse-small">
              Referral capacity accrues only while you have a tool actually operating, and no capacity is credited
              retroactively for a referral that qualifies late.
            </p>
          </div>

          <div className="space-y-4">
            <p className="pse-micro">How a referral qualifies</p>
            <ol className="pse-ladder pse-panel pse-panel-body">
              {[
                ['Registered', 'Signed up with your referral code. Nothing is credited at this stage.'],
                ['Wallet connected', 'Connected a BNB Smart Chain wallet to their own account.'],
                ['Tool purchased', 'Bought a mining tool with their own funds.'],
                ['Mining active', 'The tool is operating inside the campaign.'],
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

      {/* ── 04 · Campaign ────────────────────────────────────────────────── */}
      <Section
        id="campaign"
        index="04"
        kicker="Campaign lifecycle"
        title={`A ${clock.totalDays}-day window with a defined end.`}
        lede="Mining is only live while the campaign is. Each phase changes what happens to your accrual, and the record of that is kept."
      >
        <ol className="pse-rail" aria-label="Campaign lifecycle phases">
          {clock.phases.map((phase, i) => (
            <li key={phase.key} className="pse-rail-step" data-state={phase.state}>
              <span className="pse-rail-state">
                {phase.state === 'current' ? 'Current' : phase.state === 'done' ? 'Complete' : 'Later'}
              </span>
              <span className="pse-h3">{phase.label}</span>
              <span className="pse-small">
                {
                  [
                    'The campaign opens. Tool purchases become available.',
                    'Tools operate and capacity accrues on the server.',
                    'Accrual stops. Final balances are computed for settlement.',
                    'Settled GBP is disbursed in BNB to payout wallets, after review.',
                    'The campaign is finished; records stay available.',
                  ][i]
                }
              </span>
            </li>
          ))}
        </ol>
        <p className="pse-small mt-5">
          {clock.dayNumber !== null
            ? `The campaign is currently at day ${clock.dayNumber} of ${clock.totalDays}${
                clock.daysLeft !== null ? `, with ${clock.daysLeft} days remaining` : ''
              }.`
            : 'This campaign has not reported a start date, so no day count is shown.'}
        </p>
      </Section>

      {/* ── 05 · Money ───────────────────────────────────────────────────── */}
      <Section
        id="money"
        index="05"
        kicker="Purchase, settlement, payout"
        title="Where the money moves, and where it stops."
        lede="PSEmine takes payment in BNB on BNB Smart Chain and pays out in BNB. It never holds a card, and it never converts your campaign earnings into anything else without a payout record."
      >
        <div className="pse-split">
          <div className="space-y-5">
            <p className="pse-micro">Buying a tool</p>
            <ol className="pse-ladder">
              {[
                ['Request a quote', "The GBP price is fixed and converted to a BNB amount at that quote's rate. The quote is time-limited."],
                ['Pay the quoted amount', 'You send that exact amount from your own wallet on BNB Smart Chain to the receiving address the quote shows you.'],
                ['On-chain verification', 'The transaction is verified on the chain, the hash recorded, and the amount and payer checked.'],
                ['Activation', 'A verified purchase activates the tool, and its hourly capacity is added to your account.'],
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
            <div className="pse-well px-4 py-3 space-y-2">
              <p className="pse-micro">Receiving address for tool purchases</p>
              <p className="pse-figure text-[0.8125rem] break-all">{receiver}</p>
              <p className="pse-small">
                Public by design: check the address before you sign anything. Every quote repeats it, and a payment sent
                elsewhere cannot be recovered.
              </p>
            </div>
            <p className="pse-small">
              A purchase that is never paid, is paid late, or is paid an incorrect amount is recorded as expired or
              underpaid and reviewed — never auto-corrected by the browser.
            </p>
          </div>

          <div className="space-y-5">
            <p className="pse-micro">Settlement and payout</p>
            <div className="pse-panel pse-panel-body">
              <div className="pse-kv">
                <span className="pse-kv-key">What accrues</span>
                <span className="pse-kv-val">GBP, per hour of live capacity</span>
              </div>
              <div className="pse-kv">
                <span className="pse-kv-key">What is computed</span>
                <span className="pse-kv-val">Server-side, against a checkpoint</span>
              </div>
              <div className="pse-kv">
                <span className="pse-kv-key">When it settles</span>
                <span className="pse-kv-val">After the campaign ends</span>
              </div>
              <div className="pse-kv">
                <span className="pse-kv-key">How it is paid</span>
                <span className="pse-kv-val">BNB to your payout wallet</span>
              </div>
              <div className="pse-kv">
                <span className="pse-kv-key">Before it is sent</span>
                <span className="pse-kv-val">Payout review</span>
              </div>
              <div className="pse-kv">
                <span className="pse-kv-key">Network</span>
                <span className="pse-kv-val">
                  {PSEMINE_CONSTANTS.PAYMENT_NETWORK_NAME} · chain {chainId}
                </span>
              </div>
            </div>
            <ul className="pse-body space-y-3">
              <li>
                · Set your payout wallet before the wallet-change cutoff — after it, the address on file at settlement
                is the one that is paid. The cutoff exists so a settled balance cannot be redirected.
              </li>
              <li>
                · Campaign earnings are not a balance you can withdraw mid-campaign; accrual becomes payable only at
                settlement.
              </li>
              <li>
                · Every purchase and every payout carries a transaction hash, so both directions are checkable on-chain
                instead of taken on trust.
              </li>
            </ul>
            <p className="pse-small">
              PSEmine does not promise a return, does not publish a projected yield, and does not describe capacity as
              profit. The rate is what a tool accrues per hour of live operation; the settled figure is what the service
              recorded.
            </p>
          </div>
        </div>
      </Section>

      {/* ── 06 · What is fixed ───────────────────────────────────────────── */}
      <Section
        id="record"
        index="06"
        kicker="The record"
        title="What is fixed, and what you can check."
        lede="These are properties of the product, not marketing claims — each one holds whether or not you take our word for it."
      >
        <div className="pse-capacity">
          <div className="pse-panel pse-panel-body">
            <div className="pse-kv">
              <span className="pse-kv-key">Accrual and balances</span>
              <span className="pse-kv-val">Computed server-side</span>
            </div>
            <div className="pse-kv">
              <span className="pse-kv-key">Tool prices and rates</span>
              <span className="pse-kv-val">Locked at activation</span>
            </div>
            <div className="pse-kv">
              <span className="pse-kv-key">Your wallet</span>
              <span className="pse-kv-val">Never held in custody</span>
            </div>
            <div className="pse-kv">
              <span className="pse-kv-key">Purchases and payouts</span>
              <span className="pse-kv-val">Verifiable on BscScan</span>
            </div>
            <div className="pse-kv">
              <span className="pse-kv-key">Activity</span>
              <span className="pse-kv-val">Recorded per account</span>
            </div>
            <div className="pse-kv">
              <span className="pse-kv-key">Payout destination</span>
              <span className="pse-kv-val">Yours, with a change cutoff</span>
            </div>
          </div>

          <div className="space-y-5">
            <p className="pse-body">
              You keep your own keys. PSEmine never takes custody of funds and never asks you to send anything to an
              address other than the one printed on a live quote. Tool purchases go from your wallet to the campaign's
              receiving address, and payouts go to the payout address you set.
            </p>
            <p className="pse-body">
              Tool prices, hourly rates, ownership limits and the capacity ceiling are locked: they are the same for
              every account and do not move with the market or with how much you hold. A tool's hourly capacity is
              confirmed when the purchase activates, and every change to your account is recorded in its activity trail.
            </p>
            <p className="pse-small">
              Questions about a payment, a tool or a payout are handled through{' '}
              <Link to="/help" className="pse-link">support</Link>, and the{' '}
              <Link to="/mine/guide" className="pse-link">campaign guide</Link> explains the mechanics in more detail.
            </p>
          </div>
        </div>
      </Section>

      {/* ── 07 · FAQ ─────────────────────────────────────────────────────── */}
      <Section
        id="faq"
        index="07"
        kicker="Questions"
        title="The questions this product actually raises."
      >
        <div className="pse-faq">
          {FAQ.map((item, i) => (
            <FaqItem key={item.q} q={item.q} a={item.a} index={i} />
          ))}
        </div>
      </Section>

      {/* ── Closing CTA ──────────────────────────────────────────────────── */}
      <section className="pse-section">
        <div className="pse-wrap">
          <div className="pse-close-band">
            <div className="space-y-3">
              <p className="pse-micro">
                {clock.daysLeft !== null ? `${clock.daysLeft} days remaining` : 'Campaign'}
              </p>
              <h2 className="pse-h2">
                {currentUser ? 'Your mining console is ready.' : 'Open an account and buy your first tool.'}
              </h2>
              <p className="pse-body max-w-2xl">
                An account is free. You spend nothing until you choose a tool and pay for it from your own wallet — and
                the price, the hourly capacity and the ownership limit are shown before you sign anything.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Cta />
              {!currentUser && (
                <Link to="/mine/login" className="pse-btn pse-btn-quiet">
                  Sign in
                </Link>
              )}
              <Link to="/mine/guide" className="pse-btn pse-btn-quiet">
                Read the guide
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ── Footer ───────────────────────────────────────────────────────── */}
      <footer className="pse-foot">
        <div className="pse-wrap pse-foot-grid">
          <div className="space-y-3">
            <PSEmineLogo size={26} withSub />
            <p className="pse-small max-w-md">
              A {PSEMINE_CONSTANTS.CAMPAIGN_DURATION_DAYS}-day mining campaign on BNB Smart Chain. Tools are bought with
              BNB, capacity is priced in GBP per hour, and settled earnings are paid out in BNB.
            </p>
          </div>
          <nav className="pse-foot-links" aria-label="PSEmine footer">
            <Link className="pse-foot-link" to="/mine/guide">Campaign guide</Link>
            <Link className="pse-foot-link" to="/mine/signup">Create account</Link>
            <Link className="pse-foot-link" to="/mine/login">Sign in</Link>
            <Link className="pse-foot-link" to="/help">Support</Link>
            <Link className="pse-foot-link" to="/terms">Terms</Link>
            <Link className="pse-foot-link" to="/privacy">Privacy</Link>
          </nav>
        </div>
        <div className="pse-wrap mt-8 flex flex-wrap items-center gap-3">
          <PSEmineMark size={16} decorative />
          <p className="pse-small">
            No projected returns, no guaranteed earnings, no custody of your funds. Figures shown are the product's
            locked economics and the live campaign record.
          </p>
        </div>
      </footer>
    </div>
  );
};

export default PSEMineLanding;
