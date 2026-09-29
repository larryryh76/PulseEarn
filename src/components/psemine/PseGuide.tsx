/**
 * The PSEmine guide — an application surface, not a page of documentation.
 *
 * WHAT IT IS. A plate over the console holding eight concepts, one at a time:
 * a short explanation, one real product visual, and — where the concept has a
 * surface of its own — the action that takes the reader to it. The rail states
 * where the reader is, which is the only progress this product can honestly
 * show: the concepts are a reading order, not a sequence of system stages, and
 * nothing here claims a percentage of anything.
 *
 * WHY AN OVERLAY. Learning the product should not cost the reader the product.
 * The plate opens over the console, so the campaign strip and the account's real
 * figures stay visible beneath it, and finishing onboarding reveals the console
 * already in place rather than routing the reader to a page they have to trust
 * is there.
 *
 * THE VISUALS ARE THE PRODUCT'S OWN. Every stage draws an instrument the
 * product actually uses — the campaign rail, the equipment family, the capacity
 * instrument, the qualification ladder, the accrual rail, the settlement
 * statement, the payment pipeline — so the guide teaches the interface by being
 * the interface rather than by describing it in prose.
 *
 * ONBOARDING IS RECORDED, ONCE, IN THE ACCOUNT. Completion writes
 * `users/{uid}.onboardingCompleted`, the exact field the PSEmine route guard
 * reads. It is not a browser flag: a returning reader signing in on another
 * device is not shown the walkthrough again, because the account already says
 * they have seen it. SKIPPING ALSO RECORDS COMPLETION — a reader who declines
 * the tour must not be returned to it by the guard, which is what would happen
 * if skipping left the field untouched.
 *
 * NOTHING IS FABRICATED. Every figure is the locked campaign economics from
 * src/types/psemine.ts, interpolated rather than retyped, and the stage that
 * describes limits shows the campaign's limits — not a simulated account.
 */
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { doc, updateDoc } from 'firebase/firestore';
import toast from 'react-hot-toast';
import { db } from '../../firebase/config';
import { usePSEMineAuth } from '../../contexts/usePSEMineAuth';
import { LOCKED_PSEMINE_TOOLS, PSEMINE_CONSTANTS } from '../../types/psemine';
import {
  REFERRAL_STAGES, gbp, gbpHour, referralStageView, useEscapeKey, useScrollLock,
} from './pseCore';
import { PseButton, PseFact, PseFacts } from './PseBasics';
import { PseGlyph, PseTierModule, type PseGlyphName } from './PseMechanism';
import {
  CapacityInstrument, FlowRail, LifecycleRail, StatementPanel,
} from './PseInstruments';

const TOOLS = Object.values(LOCKED_PSEMINE_TOOLS).sort((a, b) => a.displayOrder - b.displayOrder);

const C = PSEMINE_CONSTANTS;

/* ═══════════════ STAGE VISUALS ═══════════════ */

/** 01 — the campaign as a dated instrument. Real tabset, real keyboard nav. */
const CampaignInstrument: React.FC = () => (
  <LifecycleRail
    days={C.CAMPAIGN_DURATION_DAYS}
    phases={[
      {
        id: 'launch',
        name: 'Launch',
        note: 'The window opens. Accrual has not started.',
        detail: `The campaign runs for a fixed ${C.CAMPAIGN_DURATION_DAYS} days from its launch date. Tools can be bought and capacity can be built before and during it.`,
      },
      {
        id: 'mining',
        name: 'Mining',
        note: 'Accrual runs. Capacity produces earnings.',
        detail: 'While the campaign is live, every operating tool produces its hourly rate in GBP. Session tools stop when a session ends until they are restarted; Elite runs continuously.',
      },
      {
        id: 'settlement',
        name: 'Settlement',
        note: 'Accrual has stopped. Final balances are calculated.',
        detail: 'Mining ends, accrual stops, and the backend finalises the balance each account accrued over the campaign. Nothing is accrued after this point.',
      },
      {
        id: 'payout',
        name: 'Payout',
        note: 'Settled balances are paid to configured payout wallets.',
        detail: `Payout requests open for settled amounts and are reviewed before payment, paid in BNB to the payout wallet on the account.`,
      },
    ]}
  />
);

/** 02 — the equipment family, the same elevation the product page draws. */
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
        <span className="pse-guide-roster-rate">{gbpHour(tool.hourlyRateGBP)}</span>
        <span className="pse-guide-roster-note">
          {gbp(tool.purchasePriceGBP)} · max {tool.maxPerUser}
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
    unitLabel="Tools, at the campaign maximum"
    referralLabel={`Referrals, at ${C.MAX_QUALIFIED_REFERRALS} × ${gbpHour(C.REFERRAL_BONUS_GBP_PER_HOUR)}`}
    totalLabel="Maximum total capacity"
    scale
  />
);

/** 04 — the qualification ladder, the five real stages the backend enforces. */
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

/** 07 — the real purchase pipeline, in the order it actually runs. */
const PAYMENT_STEPS = [
  {
    id: 'wallet',
    glyph: 'wallet' as PseGlyphName,
    name: 'Connect a wallet',
    note: 'The payment is signed by your own wallet. PSEmine never sends a transfer on your behalf.',
  },
  {
    id: 'quote',
    glyph: 'select' as PseGlyphName,
    name: 'Request a quote',
    note: 'The GBP price is fixed, and the BNB amount is quoted for a short window so the price you pay cannot drift.',
  },
  {
    id: 'pay',
    glyph: 'chain' as PseGlyphName,
    name: `Pay on ${C.PAYMENT_NETWORK_NAME}`,
    note: `The exact quoted amount is sent to the campaign\u2019s receiving address on chain ${C.DEFAULT_BSC_CHAIN_ID}. Sending less does not activate a tool.`,
  },
  {
    id: 'verify',
    glyph: 'verify' as PseGlyphName,
    name: 'Verified on-chain',
    note: 'The backend checks the sender, the recipient, the exact amount and the confirmation depth before anything activates.',
  },
  {
    id: 'activate',
    glyph: 'activate' as PseGlyphName,
    name: 'The tool activates',
    note: 'Only after verification does the tool\u2019s hourly capacity appear on the account — reported by the backend, never by this page.',
  },
];

/* ═══════════════ STAGES ═══════════════ */

interface GuideStage {
  id: string;
  /** Short rail label. */
  short: string;
  title: string;
  lede: string;
  points?: string[];
  visual: React.ReactNode;
  /** The real surface this concept describes, when it has one. */
  action?: { label: string; to: string };
}

const stages: GuideStage[] = [
  {
    id: 'campaign',
    short: 'The campaign',
    title: `A dated ${C.CAMPAIGN_DURATION_DAYS}-day mining campaign`,
    lede:
      'PSEmine is one campaign with a fixed length. You buy mining tools that produce hourly capacity, and that capacity accrues earnings in GBP while the campaign is live.',
    points: [
      'Tools are capacity priced in GBP — there is no hardware, electricity or hosting to manage.',
      'Capacity only accrues while the campaign is active; the campaign is the clock.',
      'Every figure you are shown is reported by the backend, and every event is recorded against your account.',
    ],
    visual: <CampaignInstrument />,
  },
  {
    id: 'tools',
    short: 'Tools',
    title: 'Tools are the capacity',
    lede:
      'Each tool has a fixed GBP price and a fixed hourly rate, fixed at purchase. Four tiers share one operating family and differ by duty, not by category.',
    points: [
      'Starter, Builder and Advanced run finite mining sessions: when a session ends, mining stops until the tool is restarted.',
      'Elite runs continuously while the campaign is active and never needs a manual restart.',
      'Each tier has an ownership limit, so capacity is built deliberately rather than bought without bound.',
    ],
    visual: <TierRoster />,
    action: { label: 'Open the tool catalogue', to: '/mine/tools' },
  },
  {
    id: 'capacity',
    short: 'Capacity',
    title: 'Tool capacity + referral capacity',
    lede:
      'Your total hourly capacity is the sum of the tools you own plus one bonus for each qualified referral. Both sides have a stated maximum, and the two maximums are the campaign\u2019s total.',
    points: [
      `Tools alone reach ${gbpHour(C.MAX_TOOL_CAPACITY_GBP_PER_HOUR)}.`,
      `Referrals add ${gbpHour(C.REFERRAL_BONUS_GBP_PER_HOUR)} each, up to ${C.MAX_QUALIFIED_REFERRALS} qualified referrals.`,
      `Capacity is what accrues: change either side and every subsequent hour is worth a different amount.`,
    ],
    visual: <CapacityArithmetic />,
  },
  {
    id: 'referrals',
    short: 'Referrals',
    title: 'A referral qualifies in five stages',
    lede:
      'A referral is an account that registered with your code and then genuinely started mining. Only a qualified referral adds capacity, and it applies from the moment it qualifies.',
    points: [
      'Qualification is decided by the backend from real account events, not by the invite being opened.',
      'Capacity never applies retroactively: an hour that accrued before qualification is not re-priced.',
      'Only the first tools actually activate a referral, and qualification is capped per account.',
    ],
    visual: <ReferralLadder />,
    action: { label: 'Open referrals', to: '/mine/referrals' },
  },
  {
    id: 'earnings',
    short: 'Earnings',
    title: 'How capacity becomes a balance',
    lede:
      'Accrual is produced by capacity, banked by the backend, and reported back to this console. The console is a view of the balance, never its source.',
    visual: <FlowRail steps={ACCRUAL_STEPS} label="How accrual becomes a balance" />,
    action: { label: 'Open the console', to: '/mine/dashboard' },
  },
  {
    id: 'settlement',
    short: 'Settlement',
    title: 'Settlement changes the denomination, once',
    lede:
      'Accrual and settlement are denominated in GBP. Payout is denominated in BNB. Settlement is the single point where the unit changes, and the two are never added together.',
    points: [
      'Accrued is not withdrawable: it becomes payable only when settlement finalises it.',
      'A request is reviewed before it is paid, and one request is reviewed at a time.',
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
    action: { label: 'Open wallet & payouts', to: '/mine/wallet' },
  },
  {
    id: 'payments',
    short: 'BNB payments',
    title: 'Buying a tool with BNB',
    lede: `Purchases are paid in ${C.PAYMENT_NETWORK_NAME}. The price is fixed in GBP; the BNB amount is fixed by a quote for its window, and the backend verifies the transfer on-chain before anything activates.`,
    points: [
      'The purchase is bound to the paying wallet before anything is signed, so only that wallet can complete it.',
      'A wrong network or an underpayment does not activate a tool — the verification simply does not pass.',
    ],
    visual: <FlowRail steps={PAYMENT_STEPS} label="How a tool purchase is paid and verified" />,
    action: { label: 'Read the purchase terms', to: '/mine/purchase-terms' },
  },
  {
    id: 'end',
    short: 'Campaign end',
    title: 'What happens when the campaign ends',
    lede:
      'The campaign has a defined end, and everything after it follows from the balance the backend settled. Nothing accrues afterwards, and nothing is deleted.',
    visual: (
      <PseFacts cols={2}>
        <PseFact label="Purchases" value="Close when the campaign is no longer active" text />
        <PseFact label="Accrual" value="Stops at the campaign end and is not resumed" text />
        <PseFact label="Settlement" value="Finalises the accrued balance, still denominated in GBP" text />
        <PseFact label="Payouts" value="Open for settled amounts, reviewed, then paid in BNB" text />
        <PseFact label="Records" value="Purchases, accrual events and payouts stay readable in activity" text />
        <PseFact label="Terms" value="Campaign and payout terms state the same thing in full" text />
      </PseFacts>
    ),
    action: { label: 'Read the campaign terms', to: '/mine/campaign-terms' },
  },
];

/*
 * The stage's way into the real surface it describes. Deliberately an anchor,
 * not a button: it navigates, so it should behave like a link (open in a new
 * tab, copy the address, be announced as a link). Its class makes it look like a
 * control because that is what it is here — the alternative, a styled `<div>`
 * with onClick, is exactly how a product starts feeling simulated.
 */
const StageAction: React.FC<{ to: string; label: string }> = ({ to, label }) => {
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

/* ═══════════════ PLATE ═══════════════ */

export const PseGuide: React.FC<{
  /** `onboarding` is the once-after-enrolment walkthrough; `reference` is the console reference. */
  mode: 'reference' | 'onboarding';
}> = ({ mode }) => {
  const navigate = useNavigate();
  const { currentUser } = usePSEMineAuth();
  const [index, setIndex] = React.useState(0);
  const [finishing, setFinishing] = React.useState(false);

  const plateRef = React.useRef<HTMLDivElement | null>(null);
  const titleRef = React.useRef<HTMLHeadingElement | null>(null);
  const firstRender = React.useRef(true);

  const stage = stages[index];
  const isLast = index === stages.length - 1;
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

  const leave = React.useCallback(() => {
    navigate('/mine/dashboard', { replace: isOnboarding });
  }, [navigate, isOnboarding]);

  /* Escape dismisses the reference guide. In onboarding it records completion
     instead, because dismissing without recording would send the guard straight
     back to the plate — a loop the reader cannot escape. */
  const dismiss = React.useCallback(() => {
    if (isOnboarding) void complete();
    else leave();
  }, [isOnboarding, complete, leave]);

  useScrollLock(true);

  React.useEffect(() => {
    plateRef.current?.focus();
  }, []);

  // Escape is bound once per mode; the handler is stable for the whole open.
  useEscapeKey(true, dismiss);

  /* The stage's heading takes focus as the stage changes, so a screen reader is
     told what the plate now says instead of being left at the top of a dialog
     whose contents changed underneath it. The first paint is exempt: the plate
     itself takes focus then, and moving it immediately would be a jump. */
  React.useEffect(() => {
    if (firstRender.current) { firstRender.current = false; return; }
    titleRef.current?.focus();
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
    ).filter(el => el.offsetParent !== null || el.className.includes('pse-guide'));
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

  const progress = ((index + 1) / stages.length) * 100;

  return (
    <div className="pse-guide-scrim">
      <div
        ref={plateRef}
        tabIndex={-1}
        className="pse-guide"
        role="dialog"
        aria-modal="true"
        aria-labelledby="pse-guide-title"
        onKeyDown={onKeyDown}
      >
        <header className="pse-guide-head">
          <span className="pse-guide-id">
            <span className="pse-guide-name">
              {isOnboarding ? 'PSEmine onboarding' : 'PSEmine guide'}
            </span>
          </span>
          <span className="pse-guide-progress" aria-hidden="true">
            {String(index + 1).padStart(2, '0')} / {String(stages.length).padStart(2, '0')}
          </span>
          <PseButton variant="secondary" size="sm" onClick={dismiss} disabled={finishing}>
            {isOnboarding ? 'Skip guide' : 'Close'}
          </PseButton>
        </header>

        <span className="pse-guide-line" aria-hidden="true">
          <span className="pse-guide-line-fill" style={{ '--pse-w': `${progress}%` } as React.CSSProperties} />
        </span>

        <div className="pse-guide-body">
          <nav className="pse-guide-rail" aria-label="Guide contents">
            <ol className="m-0 list-none p-0">
              {stages.map((s, i) => (
                <li key={s.id}>
                  <button
                    type="button"
                    className="pse-guide-rail-item w-full border-0 bg-transparent text-left"
                    aria-current={i === index}
                    data-done={i < index ? 'true' : 'false'}
                    onClick={() => setIndex(i)}
                  >
                    <span className="pse-guide-rail-num" aria-hidden="true">
                      {String(i + 1).padStart(2, '0')}
                    </span>
                    <span>{s.short}</span>
                  </button>
                </li>
              ))}
            </ol>
          </nav>

          <div className="pse-guide-stage">
            <div className="pse-guide-visual">{stage.visual}</div>

            <h2 className="pse-guide-title" id="pse-guide-title" ref={titleRef} tabIndex={-1}>
              {stage.title}
            </h2>
            <p className="pse-guide-lede">{stage.lede}</p>

            {stage.points && stage.points.length > 0 && (
              <ul className="pse-guide-points">
                {stage.points.map(point => (
                  <li key={point} className="pse-guide-point">
                    <span className="pse-guide-point-glyph" aria-hidden="true">
                      <PseGlyph name="audit" size={14} />
                    </span>
                    <span>{point}</span>
                  </li>
                ))}
              </ul>
            )}

            {stage.action && <StageAction to={stage.action.to} label={stage.action.label} />}
          </div>
        </div>

        <footer className="pse-guide-foot">
          <span className="pse-guide-foot-note">
            {isOnboarding
              ? 'Shown once. Reopen it from the guide in the console whenever you want.'
              : `Step ${index + 1} of ${stages.length}`}
          </span>
          <PseButton
            variant="secondary"
            onClick={() => setIndex(i => Math.max(0, i - 1))}
            disabled={index === 0}
          >
            Back
          </PseButton>
          {isLast ? (
            <PseButton onClick={() => (isOnboarding ? void complete() : leave())} busy={finishing}>
              {isOnboarding ? 'Finish and open the console' : 'Close guide'}
            </PseButton>
          ) : (
            <PseButton onClick={() => setIndex(i => Math.min(stages.length - 1, i + 1))}>
              Next
            </PseButton>
          )}
        </footer>
      </div>
    </div>
  );
};

export default PseGuide;
