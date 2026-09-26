/**
 * PseLandingVisuals — the PUBLIC landing's instruments.
 *
 * Every visual here is built from the product's real domain: the locked tool
 * economics, the real capacity ceilings, the real campaign clock and the real
 * referral stages. Nothing invents a user, an earning, a referral, a purchase,
 * a payout or a statistic.
 *
 * The landing is a CAMPAIGN BRIEF, not a dashboard: it uses the same canonical
 * instruments as the console (DutyRail, CapacityRail, ModulePlate, ledger
 * rows) at publication scale, and never the console's chrome.
 */
import React from 'react';
import { Link } from 'react-router-dom';
import {
  LOCKED_PSEMINE_TOOLS, PSEMINE_CONSTANTS, type PSEToolTierId,
} from '../../types/psemine';
import { gbp, gbpHour } from './pse';
import { ModulePlate, ModuleMark, DutySegments, type DutyModel } from './PSEBrand';

const TOOLS = Object.values(LOCKED_PSEMINE_TOOLS).sort((a, b) => a.displayOrder - b.displayOrder);
const dutyOf = (id: PSEToolTierId): DutyModel =>
  LOCKED_PSEMINE_TOOLS[id].operating.model === 'continuous' ? 'continuous' : 'session';

/* ═══════════════════════════════════════════════════════════════════════════
   THE TOOLS — one family, four tiers, at real price / capacity / ownership.
   A spec sheet, not four marketing cards: the same rows in the same order for
   every tier, so tiers are compared by scanning.
   ═════════════════════════════════════════════════════════════════════════ */

export const ToolSpecSheet: React.FC<{ purchaseHref: string; purchaseEnabled: boolean }> = ({
  purchaseHref, purchaseEnabled,
}) => (
  <div className="pse-stack">
    <div className="pse-specs">
      {TOOLS.map(t => (
        <div key={t.id} className="pse-spec-col">
          <ModulePlate
            tier={t.tier as 1 | 2 | 3 | 4}
            name={t.name}
            rateGBPPerHour={t.hourlyRateGBP}
            priceGBP={t.purchasePriceGBP}
            maxPerUser={t.maxPerUser}
            duty={dutyOf(t.id)}
            artSize={170}
          >
            <div className="pse-rule" style={{ marginTop: 4, paddingTop: 10 }}>
              <div className="pse-spec-line">
                <span>Capacity at limit</span>
                <span>{gbpHour(t.hourlyRateGBP * t.maxPerUser)}</span>
              </div>
              <div className="pse-spec-line" style={{ marginTop: 6 }}>
                <span>Duty</span>
                <span>{dutyOf(t.id) === 'continuous' ? 'Continuous' : 'Session · 24h'}</span>
              </div>
            </div>
            <Link
              to={purchaseHref}
              className="pse-btn pse-btn-2 pse-btn-sm pse-btn-full"
              aria-disabled={!purchaseEnabled}
              style={{ marginTop: 10 }}
            >
              {purchaseEnabled ? `Buy ${t.name}` : 'Purchases closed'}
            </Link>
          </ModulePlate>
        </div>
      ))}
    </div>
    <p className="pse-meta pse-measure">
      All four tiers are additive and share one operating model per tier. Tool capacity is capped at{' '}
      {gbpHour(PSEMINE_CONSTANTS.MAX_TOOL_CAPACITY_GBP_PER_HOUR)} across the four ownership limits shown
      above. Prices and hourly rates are fixed in GBP for the whole campaign; you pay the fixed GBP price in
      BNB at the live rate quoted at checkout.
    </p>
  </div>
);

/* ═══════════════════════════════════════════════════════════════════════════
   THE SPECIMEN — the console's honest start state.
   £0.00, £0.00/hour, no tools: exactly what a day-0 account holds. The register
   still shows every lane as AVAILABLE with its real capacity, because that is
   the information a new operator needs. It is never dressed up as holdings.
   ═════════════════════════════════════════════════════════════════════════ */

export const SpecimenSheet: React.FC<{
  capacityRail: React.ReactNode;
  dutyRail: React.ReactNode;
  dayLabel: string;
}> = ({ capacityRail, dutyRail, dayLabel }) => (
  <section className="pse-ledger">
    <header className="pse-ledger-head">
      <div className="min-w-0">
        <h2 className="pse-h3">Console specimen</h2>
        <p className="pse-meta mt-1">{dayLabel}</p>
      </div>
      <span className="pse-np">No capacity held</span>
    </header>

    <div className="pse-pad">
      {dutyRail}
    </div>

    <div className="pse-rule" />
    <div className="pse-pad">
      {capacityRail}
    </div>

    <div className="pse-ledger-foot">
      <p className="pse-meta pse-measure">
        This is the console in its real starting state: no tools held, £0.00 accrued and £0.00/hour of
        capacity. Every lane is drawn as AVAILABLE with the capacity it would contribute once you own it —
        the campaign's own economics, not an illustration of earnings.
      </p>
    </div>
  </section>
);

/* ═══════════════════════════════════════════════════════════════════════════
   THE DUTY MODELS — the one behavioural difference between tiers, drawn.
   ═════════════════════════════════════════════════════════════════════════ */

export const DutyModels: React.FC = () => (
  <div className="pse-grid-2">
    <div className="pse-stack-tight">
      <div className="pse-mod-plate" style={{ justifyContent: 'flex-start' }}>
        <ModuleMark tier={1} size={150} active className="pse-mod-art" />
      </div>
      <p className="pse-np">Session duty — Starter · Builder · Advanced</p>
      <div style={{ maxWidth: 220 }}><DutySegments duty="session" running /></div>
      <p className="pse-copy-s pse-measure">
        A tool mines inside a finite operating session. When the session ends, mining stops until you restart
        it — maintenance is free, and the backend needs a short restart period before mining resumes.
        Nothing accrues while a tool is stopped or restarting.
      </p>
    </div>
    <div className="pse-stack-tight">
      <div className="pse-mod-plate" style={{ justifyContent: 'flex-start' }}>
        <ModuleMark tier={4} size={150} active className="pse-mod-art" />
      </div>
      <p className="pse-np">Continuous duty — Elite</p>
      <div style={{ maxWidth: 220 }}><DutySegments duty="continuous" running /></div>
      <p className="pse-copy-s pse-measure">
        Elite operates continuously while the campaign is active: one unbroken duty rail, no manual session
        restarts. Its hourly rate is fixed like every other tier — continuity is the difference, not a
        different rate of accrual.
      </p>
    </div>
  </div>
);

/* ═══════════════════════════════════════════════════════════════════════════
   THE MONEY PATH — GBP accounting vs BNB settlement, kept visibly apart.
   ═════════════════════════════════════════════════════════════════════════ */

const PATH: Array<{ n: string; title: string; body: string; key: 'GBP' | 'BNB' }> = [
  { n: '01', title: 'Quote', key: 'GBP', body: `The fixed GBP price is converted to an exact BNB amount and bound to your account for ${PSEMINE_CONSTANTS.QUOTE_EXPIRATION_MINUTES} minutes.` },
  { n: '02', title: 'Pay in BNB', key: 'BNB', body: `You send exactly the quoted amount to the campaign receiving wallet on ${PSEMINE_CONSTANTS.PAYMENT_NETWORK_NAME}.` },
  { n: '03', title: 'Verify', key: 'BNB', body: 'Sender, recipient, amount and confirmation depth are checked against the quote before a tool activates.' },
  { n: '04', title: 'Accrue', key: 'GBP', body: 'The activated tool accrues hourly against your GBP ledger while its duty cycle is open.' },
  { n: '05', title: 'Settle', key: 'GBP', body: `Accrual stops at day ${PSEMINE_CONSTANTS.CAMPAIGN_DURATION_DAYS}; final balances are computed from the mining ledger.` },
  { n: '06', title: 'Payout', key: 'BNB', body: 'Reviewed payout requests are paid in BNB to the payout wallet you configured before the deadline.' },
];

export const MoneyPath: React.FC = () => (
  <div className="pse-stack">
    <div className="pse-path">
      {PATH.map(step => (
        <div key={step.n} className="pse-path-node">
          <p className="pse-np">{step.n}</p>
          <p className="pse-label-b">{step.title}</p>
          <span className={step.key === 'BNB' ? 'pse-chain' : 'pse-np pse-cyan'}>
            {step.key === 'BNB' && <span className="pse-chain-mark" aria-hidden="true" />}
            {step.key}
          </span>
          <p className="pse-meta">{step.body}</p>
        </div>
      ))}
    </div>
    <p className="pse-meta pse-measure">
      GBP is the campaign's accounting language; BNB is only ever the payment and payout rail. A balance you
      have accrued is not a balance you can withdraw before the ledger is finalised, and nothing on this page
      is estimated by the browser.
    </p>
  </div>
);

/* ═══════════════════════════════════════════════════════════════════════════
   THE REFERRAL LANES — capacity lanes, never marketplace inventory.
   0/5 → 5/5, each qualified lane contributing its real £0.30/hour.
   ═════════════════════════════════════════════════════════════════════════ */

export const ReferralLanes: React.FC<{ qualified?: number }> = ({ qualified = 0 }) => {
  const max = PSEMINE_CONSTANTS.MAX_QUALIFIED_REFERRALS;
  const on = Math.min(Math.max(0, qualified), max);
  const bonus = PSEMINE_CONSTANTS.REFERRAL_BONUS_GBP_PER_HOUR;
  return (
    <div className="pse-stack-tight">
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <p className="pse-np">Qualified lanes {on}/{max}</p>
        <p className="pse-n pse-fig-c pse-cyan">+{gbpHour(on * bonus)}</p>
      </div>
      <div className="pse-duty-blocks" role="img" aria-label={`${on} of ${max} referral lanes qualified`}>
        {Array.from({ length: max }, (_, i) => (
          <span key={i} className="pse-duty-dec">
            <span className="pse-duty-tick" style={{ height: 26 }} data-state={i < on ? 'elapsed' : 'pending'} />
          </span>
        ))}
      </div>
      <div className="pse-duty-phases">
        {Array.from({ length: max }, (_, i) => (
          <span key={i} className="pse-duty-phase" data-state={i < on ? 'done' : 'pending'}>
            {i < on ? 'Qualified' : `Lane ${i + 1}`}
          </span>
        ))}
      </div>
      <p className="pse-meta pse-measure">
        Each qualified referral adds {gbpHour(bonus)} to your mining capacity for the rest of the campaign —
        up to {gbpHour(PSEMINE_CONSTANTS.MAX_REFERRAL_CAPACITY_GBP_PER_HOUR)} across{' '}
        {max} referrals. Capacity applies from the qualification moment forward, never retroactively.
      </p>
    </div>
  );
};

/* ═══════════════════════════════════════════════════════════════════════════
   THE QUALIFICATION CLAUSES — what a referral must actually do.
   ═════════════════════════════════════════════════════════════════════════ */

export const REFERRAL_CLAUSES: Array<{ k: string; v: string }> = [
  { k: 'Registered with your referral code', v: 'Stage 1' },
  { k: 'Connected a BNB Smart Chain wallet', v: 'Stage 2' },
  { k: 'Purchased a mining tool', v: 'Stage 3' },
  { k: 'Mining active on their account', v: 'Stage 4' },
  { k: 'Qualified — capacity added to your ledger', v: 'Stage 5' },
];

export const ReferralClauses: React.FC = () => (
  <div className="pse-ledger">
    <div className="pse-ledger-legend" data-cols={2}>
      <span className="pse-np">Requirement</span>
      <span className="pse-np" style={{ textAlign: 'right' }}>Stage</span>
    </div>
    <div className="pse-ledger-body">
      {REFERRAL_CLAUSES.map(c => (
        <div key={c.k} className="pse-row">
          <div className="pse-row-k"><p className="pse-label">{c.k}</p></div>
          <span className="pse-row-v pse-row-v-2 pse-np" style={{ alignSelf: 'center' }}>{c.v}</span>
        </div>
      ))}
      <div className="pse-row">
        <div className="pse-row-k">
          <p className="pse-label-b">Maximum referral capacity</p>
          <p className="pse-meta mt-1">
            {PSEMINE_CONSTANTS.MAX_QUALIFIED_REFERRALS} lanes × {gbpHour(PSEMINE_CONSTANTS.REFERRAL_BONUS_GBP_PER_HOUR)}
          </p>
        </div>
        <span className="pse-row-v pse-n pse-cyan" style={{ alignSelf: 'center' }}>
          +{gbpHour(PSEMINE_CONSTANTS.MAX_REFERRAL_CAPACITY_GBP_PER_HOUR)}
        </span>
      </div>
    </div>
  </div>
);

/* ═══════════════════════════════════════════════════════════════════════════
   THE ASSURANCE CLAUSES — how the product behaves, stated plainly.
   ═════════════════════════════════════════════════════════════════════════ */

export const ASSURANCE: Array<{ t: string; d: string }> = [
  { t: 'Balances live in a server-side ledger', d: 'Earnings are deterministic entries in an append-only mining ledger. No client field can be edited into a balance.' },
  { t: 'Payments are verified, not asserted', d: 'Sender, recipient, exact amount and confirmation depth are checked against the server quote before a tool activates, with replay protection.' },
  { t: 'The browser cannot price or approve', d: 'It may request a quote, display the amount to send and show verification status. It cannot set a price, approve a payment or activate a tool.' },
  { t: 'Duty cycles are enforced server-side', d: 'Cycle state, restart timing and accrual windows are derived and validated on the server at every step. Maintenance is always free.' },
  { t: 'One qualification path for referrals', d: 'A referral qualifies once, through a single auditable backend path with anti-abuse checks — never retroactively.' },
  { t: 'Separate product, shared sign-in', d: 'A PSEmine session never triggers PulseEarn points, tasks or rewards. The account is shared; the product behaviour is not.' },
];

export const AssuranceList: React.FC = () => (
  <div className="pse-stack">
    {ASSURANCE.map((a, i) => (
      <div key={a.t} className="pse-clause">
        <span className="pse-clause-no">{String(i + 1).padStart(2, '0')}</span>
        <div className="min-w-0">
          <p className="pse-label-b">{a.t}</p>
          <p className="pse-meta mt-1 pse-measure">{a.d}</p>
        </div>
      </div>
    ))}
  </div>
);

/* ═══════════════════════════════════════════════════════════════════════════
   THE TIER LEDGER — the four tiers as one comparable read (closing CTA).
   ═════════════════════════════════════════════════════════════════════════ */

export const TierLedger: React.FC = () => (
  <div className="pse-ledger">
    <div className="pse-ledger-legend" data-cols={2}>
      <span className="pse-np">Tier</span>
      <span className="pse-np" style={{ textAlign: 'right' }}>£ / hour · price</span>
    </div>
    <div className="pse-ledger-body">
      {TOOLS.map(t => (
        <div key={t.id} className="pse-row">
          <div className="pse-row-k">
            <p className="pse-label-b">{t.name}</p>
            <p className="pse-meta mt-1">
              Max {t.maxPerUser} per account · at limit {gbpHour(t.hourlyRateGBP * t.maxPerUser)}
            </p>
          </div>
          <span className="pse-row-v pse-n" style={{ alignSelf: 'center' }}>
            {gbpHour(t.hourlyRateGBP)}
            <span className="pse-meta" style={{ marginLeft: 10 }}>{gbp(t.purchasePriceGBP)}</span>
          </span>
        </div>
      ))}
    </div>
    <div className="pse-ledger-foot">
      <p className="pse-np">
        Ceiling · tools {gbpHour(PSEMINE_CONSTANTS.MAX_TOOL_CAPACITY_GBP_PER_HOUR)} + referrals{' '}
        {gbpHour(PSEMINE_CONSTANTS.MAX_REFERRAL_CAPACITY_GBP_PER_HOUR)} ={' '}
        {gbpHour(PSEMINE_CONSTANTS.MAX_THEORETICAL_CAPACITY_GBP_PER_HOUR)}
      </p>
    </div>
  </div>
);
