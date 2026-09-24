import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, ChevronDown, Menu, X } from 'lucide-react';
import { usePSEMine } from '../../contexts/PSEMineContext';
import { usePSEMineAuth } from '../../contexts/usePSEMineAuth';
import { LOCKED_PSEMINE_TOOLS, PSEMINE_CONSTANTS } from '../../types/psemine';
import {
  campaignStatusView, campaignTone, gbp, gbpHour, PSELogo, Stamp,
  DutyRail, CapacityRail, useCampaignClock, usePseDocumentTitle,
} from '../../components/psemine/pse';
import { ModuleMark } from '../../components/psemine/PSEBrand';
import {
  ToolSpecSheet, SpecimenSheet, DutyModels, MoneyPath,
  ReferralLanes, ReferralClauses, AssuranceList, TierLedger,
} from '../../components/psemine/PseLandingVisuals';

/**
 * PSEMineLanding — the public product brief at /mine.
 *
 * This is PUBLIC MARKETING, not a dashboard. It tells one story in seven ruled
 * chapters: the product → the tools → capacity → the campaign clock → the money
 * path → referral capacity → assurance. It uses the console's canonical
 * instruments (the 90-day duty rail, the capacity register, the module family,
 * ledger rows) at publication scale, and none of the console's chrome.
 *
 * Data rules (unchanged, and enforced by omission):
 *   • Campaign status, dates, duration, network and every price, hourly rate,
 *     ownership limit and capacity ceiling come from real fields
 *     (`PSEMineCampaign`, `LOCKED_PSEMINE_TOOLS`, `PSEMINE_CONSTANTS`).
 *   • No users, earnings, purchases, referrals, payouts or statistics are
 *     invented anywhere on this page. There is no social proof to fake, so the
 *     proof is specification: the ceiling arithmetic and the verification path.
 *   • The single product visual is the console SPECIMEN — the console's real
 *     start state (no tools, £0.00, £0.00/hour), labelled as such. It never
 *     shows a holding, an earnings figure or an activity entry the visitor has
 *     not earned.
 */

const TOOLS = Object.values(LOCKED_PSEMINE_TOOLS).sort((a, b) => a.displayOrder - b.displayOrder);

const NAV = [
  { href: '#product', label: 'The product' },
  { href: '#tools', label: 'The tools' },
  { href: '#capacity', label: 'Capacity' },
  { href: '#campaign', label: 'The campaign' },
  { href: '#money', label: 'Money path' },
  { href: '#referrals', label: 'Referrals' },
  { href: '#assurance', label: 'Assurance' },
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
    q: 'Does a tool earn when its session has ended?',
    a: 'No. Starter, Builder and Advanced each mine inside a finite session: when it ends, mining stops until you restart the tool, and nothing accrues while it is stopped or restarting. Elite mines continuously while the campaign is active and never needs a manual restart.',
  },
  {
    q: 'When can I withdraw earnings?',
    a: 'Accrued earnings are campaign earnings: they settle after the campaign ends. Payout requests open at settlement and are paid to your configured BNB Smart Chain wallet after review.',
  },
  {
    q: 'Which network are payments made on?',
    a: `Payments and payouts are made on ${PSEMINE_CONSTANTS.PAYMENT_NETWORK_NAME} in BNB (chain ${PSEMINE_CONSTANTS.DEFAULT_BSC_CHAIN_ID}). Campaign balances stay in GBP until a payout is executed.`,
  },
  {
    q: 'How does a referral qualify?',
    a: `A referral moves through five stages and is counted only at the last one: they register with your code, connect a ${PSEMINE_CONSTANTS.PAYMENT_NETWORK_NAME} wallet, purchase a mining tool, start mining, and then the lane qualifies — at which point ${gbpHour(PSEMINE_CONSTANTS.REFERRAL_BONUS_GBP_PER_HOUR)} is added to your capacity from that moment forward, never retroactively. Up to ${PSEMINE_CONSTANTS.MAX_QUALIFIED_REFERRALS} lanes count.`,
  },
  {
    q: 'What happens when the campaign ends?',
    a: `Accrual stops at day ${PSEMINE_CONSTANTS.CAMPAIGN_DURATION_DAYS}. Final balances are computed from the mining ledger, payout requests open at settlement, and reviewed payouts are sent in BNB to the wallet configured on your account. The campaign is then archived with its ledger intact.`,
  },
  {
    q: 'Is this the same product as PulseEarn?',
    a: 'They share one sign-in identity and nothing else. PSEmine has its own tools, GBP accounting, ledger, activity and payouts; PulseEarn points, tasks and rewards never apply here.',
  },
];

/** Chapter heading: a numeral, a title, one lead line. Type carries the hierarchy. */
const Chapter: React.FC<{ no: string; title: string; lead?: string; right?: React.ReactNode; children: React.ReactNode; id: string; anchor?: boolean }> = ({
  no, title, lead, right, children, id, anchor = true,
}) => (
  <section id={id} data-pse-section={id} className={`pse-brief${anchor ? ' pse-anchor' : ''}`}>
    <div className="pse-brief-head">
      <div className="min-w-0">
        <p className="pse-np">Chapter {no}</p>
        <h2 className="pse-brief-title" style={{ marginTop: 8 }}>{title}</h2>
        {lead && <p className="pse-copy pse-measure" style={{ marginTop: 10 }}>{lead}</p>}
      </div>
      {right && <div className="flex flex-wrap items-end gap-2 lg:justify-end">{right}</div>}
    </div>
    {children}
  </section>
);

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

  const clock = useCampaignClock(campaign);
  const statusView = campaignStatusView(campaign?.status);
  const durationDays = campaign?.durationDays ?? PSEMINE_CONSTANTS.CAMPAIGN_DURATION_DAYS;
  const purchaseEnabled = campaign?.purchaseEnabled !== false && (!campaign?.status || campaign.status === 'active');

  const primaryHref = currentUser ? '/mine/dashboard' : '/mine/signup';
  const primaryLabel = currentUser ? 'Open your console' : 'Create an account';
  const purchaseHref = currentUser ? '/mine/tools' : '/mine/signup';

  /** The specimen states the console's REAL current position (day 0 before it opens). */
  const specimenLabel = clock.dayNumber === null
    ? `Day 0 — the campaign window is not open, so the console shows no day counted`
    : `Day ${clock.dayNumber} of ${clock.totalDays} — the console as it starts`;

  return (
    <div className="pse-scope pse-land">
      {/* ═══════════ Masthead — the publication's own chrome ═══════════ */}
      <header className="pse-mast" data-stuck={stuck ? 'true' : 'false'} data-pse-section="header">
        <div className="pse-land-wrap">
          <div className="pse-bar-row">
            <Link to="/mine" className="pse-mark" aria-label="PSEmine home">
              <PSELogo size={26} withWordmark />
            </Link>

            <nav className="pse-mast-nav" aria-label="PSEmine brief">
              {NAV.map(n => <a key={n.href} href={n.href}>{n.label}</a>)}
            </nav>

            <div className="pse-mast-actions">
              <Link to="/mine/login" className="pse-btn pse-btn-3 pse-btn-sm hidden sm:inline-flex">Sign in</Link>
              <Link to={primaryHref} className="pse-btn pse-btn-sm">{primaryLabel}</Link>
              <button
                type="button"
                className="pse-burger"
                aria-expanded={menuOpen}
                aria-controls="pse-land-sheet"
                aria-label={menuOpen ? 'Close menu' : 'Open menu'}
                onClick={() => setMenuOpen(v => !v)}
              >
                {menuOpen ? <X size={16} /> : <Menu size={16} />}
              </button>
            </div>
          </div>
        </div>

        {menuOpen && (
          <div className="pse-sheet" id="pse-land-sheet">
            <nav className="pse-land-wrap" aria-label="PSEmine brief sections">
              {[...NAV, { href: '#faq', label: 'Questions' }].map(n => (
                <a key={n.href} href={n.href} onClick={() => setMenuOpen(false)}>{n.label}</a>
              ))}
            </nav>
            <div className="pse-land-wrap pse-stack-tight" style={{ marginTop: 12 }}>
              <Link to={primaryHref} className="pse-btn pse-btn-full">
                {primaryLabel} <ArrowRight size={15} />
              </Link>
              <Link to="/mine/login" className="pse-btn pse-btn-2 pse-btn-full">Sign in</Link>
            </div>
          </div>
        )}
      </header>

      <main>
        {/* ═══════════ HERO — the claim, the clock, the register, the family ═══════════ */}
        <section data-pse-section="hero" className="pse-band-sec">
          <div className="pse-land-wrap">
            <div className="pse-brief-head">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2.5">
                  <Stamp tone={campaignTone(campaign?.status)} pulse={statusView.live} glyph="●">
                    {statusView.label.trim()}
                  </Stamp>
                  <span className="pse-np pse-np-2">{durationDays}-day campaign</span>
                  <span className="pse-np pse-np-2">GBP accounting</span>
                </div>

                <h1 className="pse-brief-title" style={{ fontSize: 'clamp(30px, 5vw, 52px)', marginTop: 18 }}>
                  Buy mining capacity.<br />
                  Hold it for {durationDays} days.<br />
                  <span className="pse-jade">Settle in GBP.</span>
                </h1>

                <p className="pse-copy pse-measure" style={{ marginTop: 16 }}>
                  PSEmine is a campaign-based mining product. Buy mining tools with BNB, hold a fixed hourly
                  capacity in GBP for the length of the campaign, keep every tool inside its duty cycle, and
                  the settlement ledger decides what those operating hours earned. Fixed rates, on-chain
                  verification, server-authoritative accounting.
                </p>

                <div className="flex flex-col gap-2.5 sm:flex-row" style={{ marginTop: 22 }}>
                  <Link to={primaryHref} className="pse-btn pse-btn-lg justify-center">
                    {currentUser ? 'Open your console' : 'Start mining'} <ArrowRight size={15} />
                  </Link>
                  <a href="#tools" className="pse-btn pse-btn-2 pse-btn-lg justify-center">See the tools</a>
                </div>
              </div>

              <ul className="pse-verdict-facts">
                <li>
                  <p className="pse-np">Entry price</p>
                  <p className="pse-fact-v pse-n">{gbp(LOCKED_PSEMINE_TOOLS.starter.purchasePriceGBP)}</p>
                </li>
                <li>
                  <p className="pse-np">Peak tool capacity</p>
                  <p className="pse-fact-v pse-n">{gbpHour(PSEMINE_CONSTANTS.MAX_TOOL_CAPACITY_GBP_PER_HOUR)}</p>
                </li>
                <li>
                  <p className="pse-np">Campaign</p>
                  <p className="pse-fact-v pse-n">{durationDays} days</p>
                </li>
                <li>
                  <p className="pse-np">Network</p>
                  <p className="pse-fact-v">{PSEMINE_CONSTANTS.PAYMENT_NETWORK_NAME}</p>
                </li>
              </ul>
            </div>

            <div className="pse-grid-2" style={{ marginTop: 28 }}>
              <SpecimenSheet
                dayLabel={specimenLabel}
                dutyRail={<DutyRail campaign={campaign} density="default" />}
                capacityRail={
                  <CapacityRail
                    toolCapacity={0}
                    referralCapacity={0}
                    counts={{ starter: 0, builder: 0, advanced: 0, elite: 0 }}
                    referralCount={0}
                    meta="Every lane as it would be held"
                  />
                }
              />

              <div className="pse-stack-tight">
                <p className="pse-np">The module family</p>
                <div className="pse-plate pse-pad">
                  <div className="grid grid-cols-2 gap-x-4 gap-y-6">
                    {TOOLS.map(t => (
                      <div key={t.id} className="pse-stack-tight">
                        <ModuleMark tier={t.tier as 1 | 2 | 3 | 4} size={150} active className="pse-mod-art" />
                        <p className="pse-np">Tier {t.tier}</p>
                        <p className="pse-label-b">{t.name}</p>
                        <p className="pse-n pse-jade">{gbpHour(t.hourlyRateGBP)}</p>
                        <p className="pse-meta">
                          {t.operating.model === 'continuous' ? 'Continuous duty' : 'Session duty'} · max {t.maxPerUser}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
                <p className="pse-meta pse-measure">
                  One product line, four topologies. Tier is carried by the module's construction — bay count,
                  vent bank, service rail, crest — and by its nameplate, never by being drawn larger.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* ═══════════ 01 · THE PRODUCT ═══════════ */}
        <div className="pse-land-wrap">
          <Chapter
            id="product"
            no="01"
            title="A fixed-length capacity campaign, not a trading product"
            lead="PSEmine has no order book, no token and no dynamic pricing. It has tools, capacity, operating hours and a ledger that settles once at the end."
          >
            <div className="pse-grid-2">
              <div className="pse-stack">
                <p className="pse-copy pse-measure">
                  Each tool you own contributes a fixed hourly rate, denominated in GBP, for as long as its duty
                  cycle is open. Those hours are written to an append-only mining ledger by the backend — not by
                  this page, and not by your browser.
                </p>
                <p className="pse-copy pse-measure">
                  At day {durationDays} accrual stops, final balances are computed from the ledger, and reviewed
                  payout requests are paid in BNB to the wallet you configured. Between those two moments the
                  balance is a campaign accrual: real, reported, and not yet withdrawable.
                </p>
              </div>
              <div className="pse-ledger">
                <div className="pse-ledger-legend" data-cols={2}>
                  <span className="pse-np">Product fact</span>
                  <span className="pse-np" style={{ textAlign: 'right' }}>Value</span>
                </div>
                <div className="pse-ledger-body">
                  {[
                    { k: 'Accounting currency', v: 'GBP (£)' },
                    { k: 'Payment & payout asset', v: 'BNB' },
                    { k: 'Tool tiers', v: '4' },
                    { k: 'Tool capacity ceiling', v: gbpHour(PSEMINE_CONSTANTS.MAX_TOOL_CAPACITY_GBP_PER_HOUR) },
                    { k: 'Referral capacity ceiling', v: gbpHour(PSEMINE_CONSTANTS.MAX_REFERRAL_CAPACITY_GBP_PER_HOUR) },
                    { k: 'Maximum total capacity', v: gbpHour(PSEMINE_CONSTANTS.MAX_THEORETICAL_CAPACITY_GBP_PER_HOUR) },
                    { k: 'Campaign length', v: `${durationDays} days` },
                  ].map(r => (
                    <div key={r.k} className="pse-row">
                      <div className="pse-row-k"><p className="pse-label">{r.k}</p></div>
                      <span className="pse-row-v pse-n" style={{ alignSelf: 'center' }}>{r.v}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </Chapter>
        </div>

        {/* ═══════════ 02 · THE TOOLS ═══════════ */}
        <div className="pse-land-wrap">
          <Chapter
            id="tools"
            no="02"
            title="Four tiers, one price and one hourly rate each"
            lead={`Every tier is a fixed price and a fixed hourly rate, additive up to ${gbpHour(PSEMINE_CONSTANTS.MAX_TOOL_CAPACITY_GBP_PER_HOUR)}. Per-account ownership limits keep one operator from owning the whole campaign.`}
            right={
              <Link to={purchaseHref} className="pse-btn pse-btn-2 pse-btn-sm">
                Open the marketplace <ArrowRight size={13} />
              </Link>
            }
          >
            <ToolSpecSheet purchaseHref={purchaseHref} purchaseEnabled={purchaseEnabled} />
          </Chapter>
        </div>

        {/* ═══════════ 03 · CAPACITY ═══════════ */}
        <div className="pse-land-wrap">
          <Chapter
            id="capacity"
            no="03"
            title="Your hourly rate is the sum of exactly two things"
            lead="Tool capacity plus qualified referral capacity. The register below is the same instrument the console shows you, drawn here with every lane available."
          >
            <div className="pse-grid-2">
              <div className="pse-ledger pse-pad">
                <CapacityRail
                  toolCapacity={0}
                  referralCapacity={0}
                  counts={{ starter: 0, builder: 0, advanced: 0, elite: 0 }}
                  referralCount={0}
                  label="Capacity register"
                  meta="Nothing held — every lane available"
                />
              </div>
              <div className="pse-stack" style={{ marginTop: 4 }}>
                {[
                  ['Tools add capacity, per tool', `Owned tools are summed at their fixed hourly rate: ${TOOLS.map(t => `${t.name} ${gbpHour(t.hourlyRateGBP)}`).join(' · ')}.`],
                  ['Ownership limits are the cap', `The four tiers' per-account limits sum to ${gbpHour(PSEMINE_CONSTANTS.MAX_TOOL_CAPACITY_GBP_PER_HOUR)} of tool capacity — the ceiling on the register.`],
                  ['Referrals add capacity too', `Each qualified referral adds ${gbpHour(PSEMINE_CONSTANTS.REFERRAL_BONUS_GBP_PER_HOUR)}, up to ${PSEMINE_CONSTANTS.MAX_QUALIFIED_REFERRALS} referrals (+${gbpHour(PSEMINE_CONSTANTS.MAX_REFERRAL_CAPACITY_GBP_PER_HOUR)}).`],
                  ['Capacity only accrues on duty', 'A tool contributes while its operating cycle is open. A stopped, restarting or completed session accrues nothing — which is why the duty rail on the console is as important as the capacity figure.'],
                ].map(([t, d], i) => (
                  <div key={t} className="pse-clause">
                    <span className="pse-clause-no">{String(i + 1).padStart(2, '0')}</span>
                    <div className="min-w-0">
                      <p className="pse-label-b">{t}</p>
                      <p className="pse-meta mt-1 pse-measure">{d}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </Chapter>
        </div>

        {/* ═══════════ 04 · THE CAMPAIGN ═══════════ */}
        <div className="pse-land-wrap">
          <Chapter
            id="campaign"
            no="04"
            title={`One ${durationDays}-day arc, from launch to closed`}
            lead="The campaign position is derived from backend campaign state — never from a browser clock. The same rail appears in the console, on every route."
          >
            <div className="pse-stack">
              <div className="pse-ledger pse-pad">
                <DutyRail campaign={campaign} density="default" />
              </div>
              <DutyModels />
              <div className="pse-ledger">
                <div className="pse-ledger-legend" data-cols={2}>
                  <span className="pse-np">Phase</span>
                  <span className="pse-np" style={{ textAlign: 'right' }}>State</span>
                </div>
                <div className="pse-ledger-body">
                  {clock.phases.map((p, i) => (
                    <div key={p.key} className="pse-row">
                      <div className="pse-row-k">
                        <p className="pse-label-b">{p.label}</p>
                        <p className="pse-meta mt-1">
                          {[
                            'Tools go on sale. Each purchase begins its first operating cycle.',
                            'Cycles run for the campaign window. Capacity accrues hourly against the ledger.',
                            'Accrual stops and final balances are computed from the mining ledger.',
                            'Reviewed payout requests are paid in BNB to configured payout wallets.',
                            'The campaign is archived with its final ledger intact.',
                          ][i]}
                        </p>
                      </div>
                      <span className="pse-row-v pse-np" style={{ alignSelf: 'center', color: p.state === 'current' ? 'var(--pse-jade-ink)' : undefined }}>
                        {p.state === 'done' ? 'Complete' : p.state === 'current' ? 'In progress' : 'Scheduled'}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </Chapter>
        </div>

        {/* ═══════════ 05 · MONEY PATH ═══════════ */}
        <div className="pse-land-wrap">
          <Chapter
            id="money"
            no="05"
            title="Quoted in GBP, paid in BNB, settled once"
            lead="The campaign keeps GBP accounting and BNB settlement strictly apart: a balance you have accrued is not a balance you can withdraw before the ledger is finalised."
          >
            <MoneyPath />
          </Chapter>
        </div>

        {/* ═══════════ 06 · REFERRALS ═══════════ */}
        <div className="pse-land-wrap">
          <Chapter
            id="referrals"
            no="06"
            title="Referrals pay capacity, not cash bonuses"
            lead="Five lanes, one qualification path. Each lane that qualifies adds a fixed hourly rate to your mining capacity for the rest of the campaign."
          >
            <div className="pse-grid-2">
              <div className="pse-ledger pse-pad">
                <ReferralLanes qualified={0} />
              </div>
              <ReferralClauses />
            </div>
          </Chapter>
        </div>

        {/* ═══════════ 07 · ASSURANCE + FAQ ═══════════ */}
        <div className="pse-land-wrap">
          <Chapter
            id="assurance"
            no="07"
            title="The browser displays state. The backend owns it."
            lead="Every value that matters — price, payment verification, capacity, accrual, qualification — is decided server-side. The application is a window onto that state, not a participant in it."
            right={<Link to="/mine/guide" className="pse-btn pse-btn-2 pse-btn-sm">Read the campaign guide</Link>}
          >
            <div className="pse-grid-2">
              <AssuranceList />
              <div className="pse-ledger pse-pad">
                <p className="pse-np">Security posture</p>
                <div className="pse-stack-tight" style={{ marginTop: 12 }}>
                  <div className="pse-spec-line"><span>Price authority</span><span>Server quote</span></div>
                  <div className="pse-spec-line"><span>Payment verification</span><span>On-chain</span></div>
                  <div className="pse-spec-line"><span>Accrual authority</span><span>Mining ledger</span></div>
                  <div className="pse-spec-line"><span>Settlement</span><span>Backend-computed</span></div>
                  <div className="pse-spec-line"><span>Wallet binding</span><span>Server-side</span></div>
                  <div className="pse-spec-line"><span>Entitlement</span><span>Per account</span></div>
                </div>
              </div>
            </div>
          </Chapter>

          <section id="faq" data-pse-section="faq" className="pse-brief pse-anchor">
            <div className="pse-brief-head">
              <div className="min-w-0">
                <p className="pse-np">Questions</p>
                <h2 className="pse-brief-title" style={{ marginTop: 8 }}>
                  What operators ask before their first purchase
                </h2>
              </div>
            </div>
            <div className="pse-faq" style={{ marginTop: 8, maxWidth: 860 }}>
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
                        className="shrink-0"
                        style={{ color: 'var(--pse-text-3)', transform: open ? 'rotate(180deg)' : undefined }}
                      />
                    </button>
                    {open && <p className="pse-copy-s pse-faq-a">{f.a}</p>}
                  </div>
                );
              })}
            </div>
          </section>
        </div>

        {/* ═══════════ CTA ═══════════ */}
        <section data-pse-section="cta" className="pse-band-sec">
          <div className="pse-land-wrap">
            <div className="pse-grid-2">
              <div className="min-w-0">
                <p className="pse-np">Start</p>
                <h2 className="pse-brief-title" style={{ marginTop: 8 }}>
                  The campaign runs for {durationDays} days.
                  {clock.daysLeft !== null && <> {clock.daysLeft} days remain.</>}
                </h2>
                <p className="pse-copy pse-measure" style={{ marginTop: 12 }}>
                  {purchaseEnabled
                    ? 'Buy a tool, keep it inside its duty cycle, and let the campaign settle your earnings at the end.'
                    : 'Purchases are currently closed for this campaign. The guide explains the campaign while you wait.'}
                </p>
                <div className="flex flex-col gap-2.5 sm:flex-row" style={{ marginTop: 20 }}>
                  <Link to={primaryHref} className="pse-btn pse-btn-lg justify-center">
                    {currentUser ? 'Open your console' : 'Create an account'} <ArrowRight size={15} />
                  </Link>
                  <a href="#tools" className="pse-btn pse-btn-2 pse-btn-lg justify-center">The tools</a>
                </div>
              </div>
              <TierLedger />
            </div>
          </div>
        </section>
      </main>

      {/* ═══════════ Footer ═══════════ */}
      <footer className="pse-foot" data-pse-section="footer">
        <div className="pse-land-wrap">
          <div className="pse-foot-cols">
            <div>
              <Link to="/mine" className="pse-mark" aria-label="PSEmine home">
                <PSELogo size={24} withWordmark />
              </Link>
              <p className="pse-meta pse-measure-s" style={{ marginTop: 12 }}>
                A {durationDays}-day campaign-based mining product with GBP accounting, BNB settlement and
                server-authoritative accrual.
              </p>
              <div className="flex flex-wrap items-center gap-3" style={{ marginTop: 14 }}>
                <span className="pse-chain"><span className="pse-chain-mark" aria-hidden="true" />BNB Smart Chain</span>
                <span className="pse-np pse-np-2">GBP campaign</span>
              </div>
            </div>

            <div>
              <p className="pse-np">Product</p>
              <div className="pse-foot-list">
                <a href="#tools">Mining tools</a>
                <a href="#capacity">Capacity register</a>
                <a href="#campaign">Campaign clock</a>
                <a href="#money">Money path</a>
              </div>
            </div>

            <div>
              <p className="pse-np">Account</p>
              <div className="pse-foot-list">
                <Link to="/mine/signup">Create an account</Link>
                <Link to="/mine/login">Sign in</Link>
                <Link to="/mine/dashboard">Mining console</Link>
                <Link to="/mine/wallet">Wallet &amp; payouts</Link>
              </div>
            </div>

            <div>
              <p className="pse-np">Reference</p>
              <div className="pse-foot-list">
                <Link to="/mine/guide">Campaign guide</Link>
                <a href="#faq">Questions</a>
                <Link to="/help">Support</Link>
              </div>
            </div>
          </div>

          <div className="pse-rule" style={{ marginTop: 26 }} />
          <div className="pse-stack-tight" style={{ marginTop: 18 }}>
            <p className="pse-meta pse-measure">
              No user statistics, campaign totals, earnings, purchases, referrals or payouts are displayed on
              this page. Every figure is a fixed campaign parameter from the product's own economics, and the
              single product visual is the console's real start state — no holdings, £0.00 accrued,
              £0.00/hour of capacity.
            </p>
            <p className="pse-meta pse-measure">
              PSEmine shares a sign-in identity with PulseEarn and nothing else: points, tasks and rewards do
              not apply to this campaign.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default PSEMineLanding;
