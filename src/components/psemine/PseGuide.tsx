/**
 * The PSEmine guide — an application surface, not a page of documentation.
 *
 * WHAT IT IS. A plate over the console holding the product's operating model, one
 * concept at a time: a short explanation, one real product instrument, and — where
 * the concept has a surface of its own — the action that takes the reader to it.
 * The contents rail states where the reader is, which is the only progress this
 * product can honestly show: the sections are a reading order, not system stages,
 * and nothing here claims a percentage of anything.
 *
 * A REFERENCE, NOT A WIZARD. The plate holds eleven topics, and the rail jumps to
 * any of them directly — there is no "step 4 of 9" and no Next button, because a
 * reader who came to check one thing should not have to walk through ten others to
 * reach it. The rail is the guide's navigation at every width: a scrollable strip
 * of labels on a phone, a column above the plate breakpoint. What the foot states
 * is position (which topic is open), not progress toward a finish line.
 *
 * THE TOPICS ARE THE OPERATING MODEL, IN THE ORDER MONEY MOVES: what the campaign
 * is → the tools that are bought → how capacity is calculated → how a referral
 * qualifies → how campaign time runs → how a purchase is priced and paid → what
 * on-chain verification checks → how earnings accrue → how settlement works → how
 * payouts work → the account and wallet surfaces. A reader who reads nothing else
 * should finish knowing where their money is at every point, and a reader who
 * reads one topic should be able to find it without reading the ten others.
 *
 * ONE OVERLAY, TWO SHAPES.
 *
 *   Below 720px  a bottom sheet: it rises from the bottom edge, carries a drag
 *                grip, is capped at 92dvh, keeps its own scrolling region, and is
 *                dismissed by tapping the scrim, dragging it down, pressing Escape
 *                or pressing Close. Its header and footer are padded inside the
 *                device safe areas, so the close control and the foot controls are
 *                never under a notch or a home indicator.
 *   At 720px+    a centred plate: the contents rail becomes a left column beside
 *                the stage, which is the form the content actually has at that
 *                width.
 *
 * WHY AN OVERLAY. Learning the product should not cost the reader the product. The
 * plate opens over the console, so the campaign strip and the account's real
 * figures stay visible beneath it — and when it is opened from the dashboard the
 * page beneath is not unmounted at all, so closing it returns the reader to the
 * same scroll position and the same loaded figures.
 *
 * THE VISUALS ARE THE PRODUCT'S OWN. Every section draws an instrument the product
 * actually uses — the unit roster, the capacity instrument, the campaign chain, the
 * accrual rail, the payment pipeline, the settlement statement — so the guide
 * teaches the interface by being the interface rather than by describing it.
 *
 * ONBOARDING IS RECORDED, ONCE, IN THE ACCOUNT. Completion writes
 * `users/{uid}.onboardingCompleted`, the exact field the PSEmine route guard reads.
 * It is not a browser flag: a returning reader signing in on another device is not
 * shown the walkthrough again, because the account already says they have seen it.
 * SKIPPING ALSO RECORDS COMPLETION — a reader who declines the tour must not be
 * returned to it by the guard, which is what would happen if skipping left the
 * field untouched.
 *
 * NOTHING IS FABRICATED. Every figure is the locked campaign economics from
 * src/types/psemine.ts and every state name is the one the backend uses,
 * interpolated rather than retyped. No section shows a simulated account.
 */
import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { doc, updateDoc } from 'firebase/firestore';
import toast from 'react-hot-toast';
import { db } from '../../firebase/config';
import { usePSEMineAuth } from '../../contexts/usePSEMineAuth';
import { LOCKED_PSEMINE_TOOLS, PSEMINE_CONSTANTS } from '../../types/psemine';
import {
  REFERRAL_STAGES, gbp, gbpHour, payoutStatusView, referralStageView, useEscapeKey, useScrollLock,
} from './pseCore';
import { PseButton, PseFact, PseFacts } from './PseBasics';
import { PseGlyph, PseTierModule, type PseGlyphName } from './PseMechanism';
import {
  CapacityInstrument, FlowRail, StatementPanel,
} from './PseInstruments';

const TOOLS = Object.values(LOCKED_PSEMINE_TOOLS).sort((a, b) => a.displayOrder - b.displayOrder);

const C = PSEMINE_CONSTANTS;

/* ═══════════════ SECTION VISUALS ═══════════════ */

/** 01 — the campaign, stated as the six facts a reader has to be able to repeat. */
const CampaignFacts: React.FC = () => (
  <PseFacts cols={2}>
    <PseFact label="Campaign length" value={`${C.CAMPAIGN_DURATION_DAYS} days from launch`} text />
    <PseFact label="Unit price" value={`${gbp(TOOLS[0].purchasePriceGBP)} – ${gbp(TOOLS[TOOLS.length - 1].purchasePriceGBP)}`} />
    <PseFact label="Capacity per unit" value={`${gbpHour(TOOLS[0].hourlyRateGBP)} – ${gbpHour(TOOLS[TOOLS.length - 1].hourlyRateGBP)}`} />
    <PseFact label="Campaign accounting" value="GBP" text />
    <PseFact label="Payment network" value={C.PAYMENT_NETWORK_NAME} text />
    <PseFact label="Payout denomination" value="BNB" text />
  </PseFacts>
);

/**
 * 02 — the unit family, the same elevation the product page draws, with the four
 * numbers a buyer is deciding between: price, capacity, ownership limit, duty.
 */
const TierRoster: React.FC = () => (
  <div className="pse-guide-roster">
    {TOOLS.map(tool => (
      <div key={tool.id} className="pse-guide-roster-cell">
        <PseTierModule
          tier={tool.displayOrder}
          continuous={tool.operating.model === 'continuous'}
          width={96}
          variant="mark"
        />
        <span className="pse-guide-roster-name">{tool.name}</span>
        <span className="pse-guide-roster-price">{gbp(tool.purchasePriceGBP)}</span>
        <span className="pse-guide-roster-rate">{gbpHour(tool.hourlyRateGBP)}</span>
        <span className="pse-guide-roster-note">
          max {tool.maxPerUser} · {tool.operating.model === 'continuous' ? 'continuous' : 'session'}
        </span>
      </div>
    ))}
  </div>
);

/** 03 — the capacity arithmetic at the campaign's own limits. */
const CapacityArithmetic: React.FC = () => (
  <CapacityInstrument
    ceiling={C.MAX_THEORETICAL_CAPACITY_GBP_PER_HOUR}
    units={C.MAX_TOOL_CAPACITY_GBP_PER_HOUR}
    referrals={C.MAX_REFERRAL_CAPACITY_GBP_PER_HOUR}
    unitLabel="Tools, at the ownership limits"
    referralLabel={`Referrals, at ${C.MAX_QUALIFIED_REFERRALS} × ${gbpHour(C.REFERRAL_BONUS_GBP_PER_HOUR)}`}
    totalLabel="Maximum total capacity"
    scale
  />
);

/** 03b — the five qualification stages the backend enforces, as an ordered ladder. */
const ReferralLadder: React.FC = () => (
  <ol className="pse-ladder">
    {REFERRAL_STAGES.map((stage, i) => (
      <li
        key={stage.id}
        className="pse-ladder-step"
        data-final={stage.id === 'qualified' ? 'true' : undefined}
      >
        <span className="pse-ladder-num" aria-hidden="true">{i + 1}</span>
        <span>
          <span className="pse-ladder-name">{stage.label}</span>
          <span className="pse-ladder-note">{referralStageView(stage.id).help}</span>
        </span>
      </li>
    ))}
  </ol>
);

/**
 * 04 — campaign time as a chain, not as a tab set.
 *
 * The five phases are a sequence a reader has to hold in order, so they are drawn
 * in order, one line each, each with what changes at that point. A horizontal tab
 * rail was the wrong instrument here: five phase names measured against a 390px
 * screen is a diagram nobody can read, and it also hid the explanation behind a
 * tap. The chain shows every phase and its consequence at once, at any width.
 */
const CAMPAIGN_CHAIN: ReadonlyArray<{ id: string; name: string; note: string }> = [
  { id: 'start', name: 'Campaign start', note: 'The window opens. Tools can be bought and capacity can be built.' },
  { id: 'mining', name: 'Mining', note: 'Operating capacity produces earnings every hour the campaign is live.' },
  { id: 'end', name: 'Campaign end', note: 'Mining stops at the campaign end. Nothing accrues after it, and nothing is deleted.' },
  { id: 'settlement', name: 'Settlement', note: 'The backend finalises the balance each account accrued. This is the payable figure.' },
  { id: 'payout', name: 'Payout', note: 'Settled GBP is reviewed, then paid in BNB to the payout wallet on the account.' },
];

const CampaignChain: React.FC = () => (
  <ol className="pse-chain" aria-label="The campaign, start to payout">
    {CAMPAIGN_CHAIN.map((step, i) => (
      <li key={step.id} className="pse-chain-step" data-terminal={i === CAMPAIGN_CHAIN.length - 1 ? 'true' : undefined}>
        <span className="pse-chain-num" aria-hidden="true">{String(i + 1).padStart(2, '0')}</span>
        <span className="pse-chain-body">
          <span className="pse-chain-name">{step.name}</span>
          <span className="pse-chain-note">{step.note}</span>
        </span>
      </li>
    ))}
  </ol>
);

/** 05 — capacity becoming a balance, as a rail of what actually happens. */
const ACCRUAL_STEPS = [
  {
    id: 'operate',
    glyph: 'accrue' as PseGlyphName,
    name: 'Capacity is operating',
    note: 'Every tool that is running produces its own hourly rate for as long as the campaign is live.',
  },
  {
    id: 'bank',
    glyph: 'server' as PseGlyphName,
    name: 'The backend banks the accrual',
    note: 'Accrual is written server-side at whole-penny boundaries, so the balance does not depend on how often this page reloads.',
  },
  {
    id: 'report',
    glyph: 'verify' as PseGlyphName,
    name: 'The console reports the balance',
    note: 'The figure on the console is the one the backend reports. The browser never estimates a balance and never extrapolates one.',
  },
  {
    id: 'record',
    glyph: 'audit' as PseGlyphName,
    name: 'Every event is recorded',
    note: 'Purchases, restarts, referral qualifications and campaign milestones are written to the account\u2019s activity ledger as they happen.',
  },
];

/** 06 — the real purchase pipeline, in the order it actually runs. */
const PAYMENT_STEPS = [
  {
    id: 'price',
    glyph: 'audit' as PseGlyphName,
    name: 'The price is fixed in GBP',
    note: 'Every tool has a published price in pounds. The GBP price is what is charged — it does not follow the market.',
  },
  {
    id: 'quote',
    glyph: 'select' as PseGlyphName,
    name: 'Request a live BNB quote',
    note: `The GBP price is converted to a BNB amount and held for ${C.QUOTE_EXPIRATION_MINUTES} minutes, so the amount you pay cannot drift while you sign.`,
  },
  {
    id: 'pay',
    glyph: 'chain' as PseGlyphName,
    name: `Pay on ${C.PAYMENT_NETWORK_NAME}`,
    note: `The quoted amount is sent from your own wallet to the campaign address on chain ${C.DEFAULT_BSC_CHAIN_ID}. The purchase is bound to that wallet before anything is signed.`,
  },
  {
    id: 'verify',
    glyph: 'verify' as PseGlyphName,
    name: 'Verified on-chain',
    note: 'The backend checks the sender, the recipient, the exact amount and the confirmation depth. A wrong network or an underpayment does not pass.',
  },
  {
    id: 'activate',
    glyph: 'activate' as PseGlyphName,
    name: 'The tool activates',
    note: 'Only after verification does the tool\u2019s hourly capacity appear on the account — reported by the backend, never by this page.',
  },
];

/** 08 — the payout states the backend uses, in the order a request passes through them. */
const PAYOUT_CHAIN = ['pending', 'under_review', 'approved', 'processing', 'paid'] as const;

const PAYOUT_STATE_NOTES: Record<(typeof PAYOUT_CHAIN)[number], string> = {
  pending: 'A request has been opened against the settled balance and is queued for review.',
  under_review: 'The request is being checked against the settled figure and the payout wallet on the account.',
  approved: 'The request has been accepted. The amount is still GBP at this point.',
  processing: 'The approved amount is being converted and sent. One request is processed at a time.',
  paid: 'The BNB has been sent to the payout wallet and the transaction is recorded against the account.',
};

const PayoutStates: React.FC = () => (
  <ol className="pse-chain" aria-label="The payout states">
    {PAYOUT_CHAIN.map((status, i) => (
      <li key={status} className="pse-chain-step" data-terminal={i === PAYOUT_CHAIN.length - 1 ? 'true' : undefined}>
        <span className="pse-chain-num" aria-hidden="true">{String(i + 1).padStart(2, '0')}</span>
        <span className="pse-chain-body">
          <span className="pse-chain-name">{payoutStatusView(status).label}</span>
          <span className="pse-chain-note">{PAYOUT_STATE_NOTES[status]}</span>
        </span>
      </li>
    ))}
  </ol>
);

/** 09 — where support is, and the account surfaces a reader should know by name. */
const SUPPORT_ROUTES: ReadonlyArray<{ to: string; label: string; note: string }> = [
  { to: '/mine/support', label: 'Support & contact', note: 'The support policy, what to include in a request, and how account issues are handled.' },
  { to: '/mine/activity', label: 'Activity ledger', note: 'Every purchase, restart, referral qualification and campaign milestone recorded on this account.' },
  { to: '/mine/wallet', label: 'Wallet & payouts', note: 'The payout wallet on the account, the payout policy, and the request history.' },
  { to: '/mine/risk', label: 'Risk disclosure', note: 'What is not guaranteed, and what a campaign rate does not mean.' },
];

const SupportRoutes: React.FC = () => (
  <ul className="pse-guide-links">
    {SUPPORT_ROUTES.map(route => (
      <li key={route.to}>
        <Link to={route.to} className="pse-guide-link-item">
          <span className="pse-guide-link-name">{route.label}</span>
          <span className="pse-guide-link-note">{route.note}</span>
        </Link>
      </li>
    ))}
  </ul>
);

/* 07 — what on-chain verification checks before a tool activates. The checks are
   the backend's, named here as the conditions a payment has to satisfy: a payment
   that satisfies all of them activates a tool, and one that fails any of them does
   not — which is why a wrong network or an underpayment is an unresolved purchase
   and never a partial activation. */
const VERIFY_CHECKS: ReadonlyArray<{ name: string; note: string }> = [
  { name: 'The paying wallet is the purchase’s wallet', note: 'the purchase is bound to one address before anything is signed' },
  { name: 'The network is the campaign’s network', note: 'a payment on any other chain is not seen' },
  { name: 'The amount covers the quoted price', note: 'an underpayment does not pass and does not partially activate' },
  { name: 'The quote has not expired', note: `${C.QUOTE_EXPIRATION_MINUTES} minutes from the moment it was issued` },
  { name: 'The transfer is confirmed to depth', note: 'a pending transaction is not a verified one' },
];

const PaymentChecks: React.FC = () => (
  <ol className="pse-checks" aria-label="What payment verification checks">
    {VERIFY_CHECKS.map((check, i) => (
      <li className="pse-checks-item" key={check.name}>
        <span className="pse-checks-mark" aria-hidden="true">{i + 1}</span>
        <span>
          <strong className="pse-strong">{check.name}</strong> — {check.note}
        </span>
      </li>
    ))}
  </ol>
);

/* ═══════════════ SECTIONS ═══════════════ */

interface GuideSection {
  id: string;
  /** Short rail label. */
  short: string;
  title: string;
  lede: string;
  points?: string[];
  visual: React.ReactNode;
  /** The real surface this section describes, when it has one. */
  action?: { label: string; to: string };
}

const sections: GuideSection[] = [
  {
    id: 'overview',
    short: 'Overview',
    title: `One dated ${C.CAMPAIGN_DURATION_DAYS}-day mining campaign`,
    lede:
      'PSEmine is one campaign with a fixed length. You buy mining tools that each add a locked capacity per hour, and that capacity accrues earnings in GBP while the campaign is live. At the campaign end the accrued balance is settled, and settled earnings are paid in BNB.',
    points: [
      'Tools are capacity priced in GBP — there is no hardware, electricity or hosting to manage.',
      'Capacity only accrues while the campaign is active; the campaign is the clock.',
      'Every figure you are shown is reported by the backend, and every event is recorded against your account.',
    ],
    visual: <CampaignFacts />,
  },
  {
    id: 'tools',
    short: 'Mining tools',
    title: 'One product line, four tools',
    lede:
      'Each tool has a fixed GBP price and a fixed hourly capacity, both locked when you buy it. The four tiers differ by duty, price and ownership limit — not by category.',
    points: [
      `Starter ${gbp(3)} · Builder ${gbp(10)} · Advanced ${gbp(50)} · Elite ${gbp(200)} — the price list is published, not quoted per buyer.`,
      'Starter, Builder and Advanced run finite mining sessions: when a session ends, mining stops until the tool is restarted. Elite runs continuously while the campaign is active.',
      `Ownership is limited per tier (max ${TOOLS.map(t => t.maxPerUser).join(' / ')}), so capacity is built deliberately rather than bought without bound.`,
      'Tools stack: every tool you own adds its own hourly capacity to your total, up to the limits above.',
    ],
    visual: <TierRoster />,
    action: { label: 'Open the tool catalogue', to: '/mine/tools' },
  },
  {
    id: 'capacity',
    short: 'Capacity calculation',
    title: 'Tool capacity + referral capacity = total capacity',
    lede:
      'Your mining capacity is one figure: the hourly rate this account produces while mining is live. It is the sum of the tools you own and one bonus for each qualified referral.',
    points: [
      `Tools alone reach ${gbpHour(C.MAX_TOOL_CAPACITY_GBP_PER_HOUR)}.`,
      `A qualified referral adds ${gbpHour(C.REFERRAL_BONUS_GBP_PER_HOUR)}, up to ${C.MAX_QUALIFIED_REFERRALS} qualified referrals (${gbpHour(C.MAX_REFERRAL_CAPACITY_GBP_PER_HOUR)}).`,
      `The campaign maximum is ${gbpHour(C.MAX_THEORETICAL_CAPACITY_GBP_PER_HOUR)} per hour.`,
      'A referral qualifies only when the account it refers genuinely starts mining; qualification is decided by the backend, and capacity never applies retroactively to hours that already accrued.',
    ],
    visual: <CapacityArithmetic />,
    action: { label: 'Open referrals', to: '/mine/referrals' },
  },
  {
    id: 'referrals',
    short: 'Referral qualification',
    title: 'A referral adds capacity only once it qualifies',
    lede:
      'Referral capacity is not awarded for a sign-up. It is awarded when the referred account genuinely starts mining, and the backend decides that — the console only reports the count.',
    points: [
      `Each qualified referral adds ${gbpHour(C.REFERRAL_BONUS_GBP_PER_HOUR)}, up to ${C.MAX_QUALIFIED_REFERRALS} qualified referrals.`,
      'Qualification is never retroactive: hours that already accrued are not recalculated when a referral qualifies.',
      'Until a referral qualifies it contributes nothing to the hourly rate — a pending referral is a promise about a future state, not a figure to add up.',
    ],
    visual: <ReferralLadder />,
    action: { label: 'Open referrals', to: '/mine/referrals' },
  },
  {
    id: 'campaign',
    short: 'Campaign timeline',
    title: 'Start, mining, end, settlement, payout',
    lede:
      'The campaign has five states and they happen in this order. Accrual only happens in one of them, and the campaign end is a fixed date rather than a decision.',
    visual: <CampaignChain />,
  },
  {
    id: 'purchases',
    short: 'Purchases',
    title: 'Buying a tool with BNB',
    lede: `The price is fixed in GBP. Between the price and the tool there are four steps: a live quote, a BNB Smart Chain payment, on-chain verification, and activation.`,
    points: [
      'The purchase is bound to the paying wallet before anything is signed, so only that wallet can complete it.',
      'A wrong network, an underpayment or an expired quote does not activate a tool — the verification simply does not pass, and the purchase stays visible as unresolved.',
      `A quote holds its BNB amount for ${C.QUOTE_EXPIRATION_MINUTES} minutes, so the amount cannot drift while the payment is signed.`,
    ],
    visual: <FlowRail steps={PAYMENT_STEPS} label="How a tool purchase is priced, paid and verified" />,
    action: { label: 'Read the purchase terms', to: '/mine/purchase-terms' },
  },
  {
    id: 'verification',
    short: 'BNB payment verification',
    title: 'What on-chain verification checks',
    lede:
      'A transaction existing is not the same as a purchase activating. The backend verifies the payment it was sent against the quote it issued, and only a payment that passes every check activates a tool.',
    points: [
      'Verification is the backend’s, against on-chain data — a purchase stays unresolved in the console until the checks pass, and is never marked active early.',
      'A failed check is not a lost order: the purchase stays visible against the account so it can be resolved rather than disappearing.',
    ],
    visual: <PaymentChecks />,
    action: { label: 'Open the tool catalogue', to: '/mine/tools' },
  },
  {
    id: 'earnings',
    short: 'Earnings',
    title: 'How capacity becomes a balance',
    lede:
      'Accrual is produced by capacity, banked by the backend, and reported back to the console. Campaign accounting is displayed in GBP at every point before payout.',
    points: [
      'The console is a view of the balance, never its source: the figure you see is the figure the backend reports.',
      'Accrued is not withdrawable. It becomes payable only when settlement finalises it after the campaign ends.',
    ],
    visual: <FlowRail steps={ACCRUAL_STEPS} label="How accrual becomes a balance" />,
    action: { label: 'Open the dashboard', to: '/mine/dashboard' },
  },
  {
    id: 'settlement',
    short: 'Settlement',
    title: 'Settlement changes the denomination, once',
    lede:
      'Accrual and settlement are denominated in GBP. Payout is denominated in BNB. Settlement is the single point where the unit changes, and the two are never added together.',
    points: [
      'When mining ends, accrual stops and the backend finalises the balance. That settled figure is the payable one.',
      'A payout request is reviewed before payment, and one request is reviewed at a time.',
    ],
    visual: (
      <StatementPanel
        steps={[
          {
            id: 'accrued',
            glyph: 'accrue',
            name: 'Accrued',
            unit: 'GBP',
            note: 'Produced hourly by operating capacity while the campaign is live. Recorded server-side as it happens.',
          },
          {
            id: 'settled',
            glyph: 'settle',
            name: 'Settled',
            unit: 'GBP',
            note: 'The campaign ends, accrual stops, and the backend finalises the balance. This figure is the payable one.',
          },
          {
            id: 'reviewed',
            glyph: 'review',
            name: 'Reviewed',
            unit: 'GBP',
            note: 'A payout request is checked before payment. The requested amount stays in GBP until it is paid.',
          },
          {
            id: 'paid',
            glyph: 'payout',
            name: 'Paid',
            unit: 'BNB',
            note: 'The settled amount is sent in BNB to the payout wallet configured on the account, with its transaction recorded.',
            terminal: true,
          },
        ]}
      />
    ),
    action: { label: 'Read the campaign terms', to: '/mine/campaign-terms' },
  },
  {
    id: 'payouts',
    short: 'Payouts',
    title: 'What a payout request passes through',
    lede:
      'A payout is requested against a settled balance and paid to the payout wallet on your account. The states below are the states the backend records — the console only reports them.',
    points: [
      'A payout wallet must be set on the account before a settled balance can be paid out.',
      'One request is reviewed at a time, and the reviewed amount stays denominated in GBP until it is paid.',
    ],
    visual: <PayoutStates />,
    action: { label: 'Open wallet & payouts', to: '/mine/wallet' },
  },
  {
    id: 'account',
    short: 'Account & wallet',
    title: 'The account surfaces, by name',
    lede:
      'Every figure in the product reads the same backend records, and each of these surfaces is where one part of the account is managed. Nothing here is a separate source of truth.',
    points: [
      'The payout wallet is a field on the account. Settlement is paid to it in BNB, and one wallet is set at a time.',
      'For anything involving a figure, include the record it comes from — every account event is already on the activity ledger.',
    ],
    visual: <SupportRoutes />,
    action: { label: 'Open wallet & payouts', to: '/mine/wallet' },
  },
];

/*
 * The section's way into the real surface it describes. Deliberately an anchor,
 * not a button: it navigates, so it should behave like a link (open in a new
 * tab, copy the address, be announced as a link). Its class makes it look like a
 * control because that is what it is here — the alternative, a styled `<div>`
 * with onClick, is exactly how a product starts feeling simulated.
 */
const SectionAction: React.FC<{ to: string; label: string }> = ({ to, label }) => {
  const navigate = useNavigate();
  return (
    <p className="m-0">
      <a
        href={to}
        className="pse-btn pse-btn--secondary pse-btn--sm"
        onClick={e => {
          e.preventDefault();
          navigate(to);
        }}
      >
        {label}
      </a>
    </p>
  );
};

/* ═══════════════ THE PLATE ═══════════════ */

/** Past this drag distance (or speed) the sheet is dismissed rather than restored. */
const DISMISS_DRAG_PX = 96;
const DISMISS_DRAG_VELOCITY = 0.5; // px per ms

export const PseGuide: React.FC<{
  /** `onboarding` is the once-after-enrolment walkthrough; `reference` is the console reference. */
  mode: 'reference' | 'onboarding';
  /** How this overlay closes. The shell owns it, because it differs by how it was opened. */
  onClose: () => void;
}> = ({ mode, onClose }) => {
  const navigate = useNavigate();
  const { currentUser } = usePSEMineAuth();
  const [index, setIndex] = React.useState(0);
  const [finishing, setFinishing] = React.useState(false);
  const [dragY, setDragY] = React.useState(0);
  const [dragging, setDragging] = React.useState(false);

  const plateRef = React.useRef<HTMLDivElement | null>(null);
  const titleRef = React.useRef<HTMLHeadingElement | null>(null);
  const stageRef = React.useRef<HTMLDivElement | null>(null);
  const railRef = React.useRef<HTMLElement | null>(null);
  const restoreFocusRef = React.useRef<HTMLElement | null>(null);
  const firstRender = React.useRef(true);
  const drag = React.useRef<{ id: number; startY: number; startT: number } | null>(null);

  const section = sections[index];
  const isLast = index === sections.length - 1;
  const isOnboarding = mode === 'onboarding';

  /**
   * Records completion and leaves the plate.
   *
   * The write is the account's own field, the one the route guard reads. If it
   * fails the guard will bring the reader back here — which is the honest
   * outcome, and the toast says so rather than pretending the walkthrough was
   * saved.
   */
  const complete = React.useCallback(async () => {
    if (!currentUser) {
      navigate('/mine/dashboard', { replace: true });
      return;
    }
    setFinishing(true);
    try {
      await updateDoc(doc(db, 'users', currentUser.uid), { onboardingCompleted: true });
      toast.success('You’re ready. Welcome to PSEmine.');
      navigate('/mine/dashboard', { replace: true });
    } catch {
      toast('Could not record onboarding on your account — you can reopen the guide at any time.');
      navigate('/mine/dashboard', { replace: true });
    } finally {
      setFinishing(false);
    }
  }, [currentUser, navigate]);

  /* Escape dismisses the reference guide. In onboarding it records completion
     instead, because dismissing without recording would send the guard straight
     back to the plate — a loop the reader cannot escape. */
  const dismiss = React.useCallback(() => {
    if (isOnboarding) void complete();
    else onClose();
  }, [isOnboarding, complete, onClose]);

  useScrollLock(true);
  useEscapeKey(true, dismiss);

  /**
   * Focus is placed once, and given back on close.
   *
   * The plate takes focus when it opens; the section's heading takes focus as the
   * section changes, so a screen reader is told what the plate now says instead of
   * being left at the top of a dialog whose contents changed underneath it. On
   * close the control that opened the plate is focused again, when it is still in
   * the document — a dialog that drops focus back to the top of the page has moved
   * the reader.
   */
  React.useEffect(() => {
    const previous = document.activeElement;
    restoreFocusRef.current = previous instanceof HTMLElement ? previous : null;
    plateRef.current?.focus();
    return () => {
      const target = restoreFocusRef.current;
      if (target && target.isConnected) target.focus();
    };
  }, []);

  React.useEffect(() => {
    if (firstRender.current) { firstRender.current = false; return; }
    // The stage scrolls; a new section starts at its top.
    if (stageRef.current) stageRef.current.scrollTop = 0;
    titleRef.current?.focus();
    // The mobile contents strip scrolls the active chip into view.
    const rail = railRef.current;
    const active = rail?.querySelector<HTMLElement>('[aria-current="true"]');
    if (rail && active) {
      rail.scrollTo({
        left: Math.max(0, active.offsetLeft - rail.clientWidth / 2 + active.clientWidth / 2),
        behavior: 'smooth',
      });
    }
  }, [index]);

  /* A light focus trap: Tab cycles the plate's own controls. A dialog that lets
     focus escape to the console behind it is a dialog with a hole in it. */
  const onKeyDown = (event: React.KeyboardEvent) => {
    if (event.key !== 'Tab') return;
    const plate = plateRef.current;
    if (!plate) return;
    const focusable = Array.from(
      plate.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
      ),
    ).filter(el => el.offsetParent !== null);
    if (focusable.length === 0) return;
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    } else if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    }
  };

  /* ── The drag-to-dismiss gesture (bottom sheet only) ──────────────────────
   * The grip is not rendered above the sheet breakpoint, so this gesture cannot
   * fire on the centred plate — the responsive form is decided in CSS, and the
   * behaviour follows it. A short drag springs back; a long one, or a fast flick,
   * dismisses. The sheet tracks the finger while the drag is in progress, because
   * a gesture with no live response is a gesture the reader will not trust. */
  const onGripDown = (event: React.PointerEvent<HTMLDivElement>) => {
    if (event.pointerType === 'mouse' && event.button !== 0) return;
    event.currentTarget.setPointerCapture?.(event.pointerId);
    drag.current = { id: event.pointerId, startY: event.clientY, startT: Date.now() };
    setDragging(true);
  };

  const onGripMove = (event: React.PointerEvent<HTMLDivElement>) => {
    const state = drag.current;
    if (!state || state.id !== event.pointerId) return;
    setDragY(Math.max(0, event.clientY - state.startY));
  };

  const endDrag = (event: React.PointerEvent<HTMLDivElement>) => {
    const state = drag.current;
    if (!state || state.id !== event.pointerId) return;
    drag.current = null;
    setDragging(false);
    const distance = Math.max(0, event.clientY - state.startY);
    const velocity = distance / Math.max(1, Date.now() - state.startT);
    setDragY(0);
    if (distance > DISMISS_DRAG_PX || velocity > DISMISS_DRAG_VELOCITY) dismiss();
  };

  return (
    <div
      className="pse-guide-scrim"
      onClick={event => { if (event.target === event.currentTarget) dismiss(); }}
      role="presentation"
    >
      <div
        ref={plateRef}
        tabIndex={-1}
        className="pse-guide"
        role="dialog"
        aria-modal="true"
        aria-labelledby="pse-guide-title"
        data-dragging={dragging ? 'true' : undefined}
        style={dragY > 0 ? { transform: `translateY(${dragY}px)` } : undefined}
        onKeyDown={onKeyDown}
      >
        {/* A touch hint, not a control: the Close button is the operable dismissal
            and the swipe is an addition to it, never the only way out. */}
        <div
          className="pse-guide-grip"
          onPointerDown={onGripDown}
          onPointerMove={onGripMove}
          onPointerUp={endDrag}
          onPointerCancel={endDrag}
          aria-hidden="true"
        >
          <span className="pse-guide-grip-bar" />
        </div>

        <header className="pse-guide-head">
          <span className="pse-guide-id">
            <span className="pse-guide-name">
              {isOnboarding ? 'PSEmine onboarding' : 'PSEmine guide'}
            </span>
          </span>
          {/* Position, not progress: the topics are a table of contents the rail
              jumps into, not a sequence to be completed. */}
          <span className="pse-guide-progress">
            Topic {index + 1} of {sections.length}
          </span>
          {isOnboarding && (
            <PseButton variant="secondary" size="sm" onClick={dismiss} disabled={finishing}>
              Skip guide
            </PseButton>
          )}
        </header>

        <div className="pse-guide-body">
          {/* One contents list in the DOM. Below the plate breakpoint it is a
              horizontal strip of chips above the stage; above it, the left rail. */}
          <nav className="pse-guide-rail" aria-label="Guide contents" ref={railRef}>
            <ol className="pse-guide-rail-list">
              {sections.map((s, i) => (
                <li key={s.id}>
                  <button
                    type="button"
                    className="pse-guide-rail-item"
                    aria-current={i === index}
                    data-done={i < index ? 'true' : 'false'}
                    onClick={() => setIndex(i)}
                  >
                    <span className="pse-guide-rail-num" aria-hidden="true">
                      {String(i + 1).padStart(2, '0')}
                    </span>
                    <span className="pse-guide-rail-text">{s.short}</span>
                  </button>
                </li>
              ))}
            </ol>
          </nav>

          <div className="pse-guide-stage" ref={stageRef}>
            <div className="pse-guide-visual">{section.visual}</div>

            <h2 className="pse-guide-title" id="pse-guide-title" ref={titleRef} tabIndex={-1}>
              {section.title}
            </h2>
            <p className="pse-guide-lede">{section.lede}</p>

            {section.points && section.points.length > 0 && (
              <ul className="pse-guide-points">
                {section.points.map(point => (
                  <li key={point} className="pse-guide-point">
                    <span className="pse-guide-point-glyph" aria-hidden="true">
                      <PseGlyph name="audit" size={14} />
                    </span>
                    <span>{point}</span>
                  </li>
                ))}
              </ul>
            )}

            {section.action && <SectionAction to={section.action.to} label={section.action.label} />}
          </div>
        </div>

        {/* THE REFERENCE HAS NO NEXT BUTTON.
          *
          * The topics are a table of contents, so stepping through them in order
          * is one option among eleven others and has no claim to the primary
          * slot. What the foot says is which topic is open and how to leave the
          * plate — the close control sits at the bottom edge, where a thumb is on
          * a phone, rather than only at the top of the sheet. The onboarding
          * walkthrough keeps its stepping, because there the order IS the
          * content: it is a tour that records completion, not a reference. */}
        <footer className="pse-guide-foot">
          <span className="pse-guide-foot-note">
            {isOnboarding
              ? `Shown once · topic ${index + 1} of ${sections.length}`
              : `${section.short} · ${index + 1} of ${sections.length}`}
          </span>
          {isOnboarding ? (
            <>
              <PseButton
                variant="secondary"
                onClick={() => setIndex(i => Math.max(0, i - 1))}
                disabled={index === 0}
              >
                Back
              </PseButton>
              {isLast ? (
                <PseButton onClick={() => void complete()} busy={finishing}>
                  Finish and open the console
                </PseButton>
              ) : (
                <PseButton onClick={() => setIndex(i => Math.min(sections.length - 1, i + 1))}>
                  Next
                </PseButton>
              )}
            </>
          ) : (
            <PseButton variant="secondary" onClick={onClose}>
              Close guide
            </PseButton>
          )}
        </footer>
      </div>
    </div>
  );
};

export default PseGuide;
