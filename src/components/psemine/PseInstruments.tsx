/**
 * PSEmine instruments — the objects the public product is actually made of.
 *
 * WHY THIS FILE EXISTS
 * A page assembled from headings, paragraphs and separators reads as a document
 * however well it is typeset. This product is a financial instrument, so its
 * public page is built from *composed surfaces*: an application window, a
 * capacity instrument, an equipment specification, a lifecycle rail, a purchase
 * console, a settlement statement and a relationship map. Prose still carries
 * the argument, but every section also contains a real object that says the same
 * thing faster — and the objects are composed, never four identical cards.
 *
 * THE SURFACE LADDER (one ladder, respected everywhere)
 *   canvas   --pse-canvas      the page
 *   panel    --pse-surface     a module that groups related controls
 *   raised   --pse-surface-2   a module that carries a decision
 *   inset    --pse-inset       a recessed well inside a module
 * Elevation is light, not shadow: a shadow-as-border ring plus an inner top
 * highlight, locked to two levels. Depth comes from layered surfaces, insets and
 * one deliberate overlap in the hero — never from a drop shadow stack.
 *
 * WHAT IS DELIBERATELY ABSENT
 * None of these instruments reads an account. They are constructed from the
 * product's locked economics (prices, rates, limits, ceilings, the campaign
 * length, the payment asset) and from nothing else: no balance, no position, no
 * countdown, no address, no status that claims to know where a visitor is. A
 * specimen is labelled as a specimen, and an illustration of a flow never
 * contains a dead control — the only button in a specimen is a real link.
 *
 * MOTION
 * `Reveal` arms a one-shot entrance through an IntersectionObserver. Elements
 * are visible by default and only become hidden when the observer is present, so
 * a failed observer can never leave the page blank; and the reduced-motion rules
 * in psemine.css mean a reader who asks for less motion sees everything
 * immediately, with the gauges already at their true values.
 *
 * THE MOTION RULE: it explains hierarchy. A gauge fills once so you read it as a
 * measurement; a rail draws once so you read it as a sequence; a panel lifts on
 * hover so you know it is a surface; a specimen's edge catches the light on hover
 * so you know it is the foreground. Nothing loops, nothing counts, nothing
 * happens merely because it can.
 */
import React from 'react';
import { Link } from 'react-router-dom';
import { PseGlyph, PseTierModule, type PseGlyphName } from './PseMechanism';

/* ── Reveal ─────────────────────────────────────────────────────────────── */

/**
 * One-shot viewport reveal. Visible by default; hidden only once we know we can
 * observe the element and bring it back.
 */
export function useReveal<T extends HTMLElement>() {
  const ref = React.useRef<T | null>(null);
  const [inview, setInview] = React.useState(true);

  React.useEffect(() => {
    const el = ref.current;
    if (!el || typeof IntersectionObserver === 'undefined') return;

    setInview(false);
    const io = new IntersectionObserver(
      entries => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setInview(true);
            io.disconnect();
          }
        }
      },
      { threshold: 0.12, rootMargin: '0px 0px -6% 0px' },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return { ref, inview };
}

type RevealTag = 'div' | 'ol' | 'ul' | 'li' | 'article' | 'section' | 'span';

/** Wraps children in a plain element that carries the reveal transition. */
export const Reveal: React.FC<{
  children: React.ReactNode;
  /** The element to render, so the reveal never breaks document semantics. */
  as?: RevealTag;
  className?: string;
  /** Stagger, in ms. Used to sequence siblings, never to delay the first paint. */
  delay?: number;
  /** Accessible name, when the element is a list that needs one. */
  label?: string;
}> = ({ children, as = 'div', className = '', delay = 0, label }) => {
  const { ref, inview } = useReveal<HTMLElement>();
  const props = {
    ref,
    className: `pse-reveal${className ? ` ${className}` : ''}`,
    'data-inview': inview ? 'true' : 'false',
    'aria-label': label,
    style: { '--pse-delay': `${delay}ms` } as React.CSSProperties,
  } as unknown as React.HTMLAttributes<HTMLElement>;
  return React.createElement(as, props, children);
};

/* ── Stat blocks ────────────────────────────────────────────────────────── */

/** A compact financial figure. Not every number is a hero statistic. */
export const Stat: React.FC<{ label: string; value: React.ReactNode; unit?: string; note?: string }> = ({
  label,
  value,
  unit,
  note,
}) => (
  <div className="pse-stat">
    <span className="pse-stat-label">{label}</span>
    <span className="pse-stat-value">
      {value}
      {unit && <span className="pse-stat-unit">{unit}</span>}
    </span>
    {note && <span className="pse-stat-note">{note}</span>}
  </div>
);

export const StatGrid: React.FC<{ cols?: 2 | 3 | 4; children: React.ReactNode; className?: string }> = ({
  cols = 4,
  children,
  className = '',
}) => <div className={`pse-stats pse-stats--${cols}${className ? ` ${className}` : ''}`}>{children}</div>;

/* ── Capacity instrument ────────────────────────────────────────────────── */

const GaugeRow: React.FC<{
  label: string;
  value: number;
  pct: string;
  fill: string;
  swatch?: string;
  total?: boolean;
}> = ({ label, value, pct, fill, swatch, total }) => (
  <div className="pse-gauge-row">
    <span className={`pse-gauge-key${total ? ' pse-gauge-key--total' : ''}`}>
      <span className={`pse-gauge-swatch${swatch ? ` ${swatch}` : ''}`} aria-hidden="true" />
      {label}
    </span>
    <span className="pse-gauge-val">
      {total ? '' : '+ '}
      {`£${value.toFixed(2)}`}
      <span className="pse-metric-unit"> /hour</span>
    </span>
    <span className="pse-gauge-track">
      <span className={`pse-gauge-fill ${fill}`} style={{ '--pse-w': pct } as React.CSSProperties} />
    </span>
  </div>
);

/**
 * The capacity instrument.
 *
 * Every row is drawn against ONE shared track, and the track itself is scaled
 * against the ceiling with a printed axis, so the three rows are proportional to
 * the same maximum and can be read against each other — which is the whole point
 * of an instrument. The stacked bar on top states the composition in a single
 * object: units plus qualified referrals, and no more. A marker on that bar sits
 * at the total, so the ceiling is visibly the end of the scale rather than an
 * arbitrary full-width block.
 */
export const CapacityInstrument: React.FC<{
  /** The ceiling in £/hour, and the denominator for every row. */
  ceiling: number;
  units: number;
  referrals: number;
  unitLabel?: string;
  referralLabel?: string;
  totalLabel?: string;
  /** Tighter spacing for use inside the hero console. */
  compact?: boolean;
  className?: string;
}> = ({
  ceiling,
  units,
  referrals,
  unitLabel = 'Unit capacity',
  referralLabel = 'Referral capacity',
  totalLabel = 'Total capacity',
  compact = false,
  className = '',
}) => {
  const pct = (v: number) => `${Math.max(0, Math.min(100, (v / ceiling) * 100))}%`;
  const total = units + referrals;
  const totalPct = Math.max(0, Math.min(100, (total / ceiling) * 100));

  return (
    <Reveal className={`pse-gauge${compact ? ' pse-gauge--compact' : ''}${className ? ` ${className}` : ''}`}>
      <div className="pse-gauge-bar">
        <span className="pse-gauge-stack">
          <span className="pse-gauge-seg pse-gauge-seg--units" style={{ '--pse-w': pct(units) } as React.CSSProperties} />
          <span
            className="pse-gauge-seg pse-gauge-seg--referrals"
            style={{ '--pse-w': pct(referrals) } as React.CSSProperties}
          />
        </span>
        <span className="pse-gauge-marker" style={{ '--pse-pos': `${totalPct}%` } as React.CSSProperties} aria-hidden="true" />
      </div>

      <div className="pse-gauge-axis" aria-hidden="true">
        <span>0</span>
        <span className="pse-gauge-axis-mid">£ per hour</span>
        <span>{ceiling.toFixed(2)}</span>
      </div>

      <div className="pse-gauge-rows">
        <GaugeRow label={unitLabel} value={units} pct={pct(units)} fill="pse-gauge-fill--units" />
        <GaugeRow
          label={referralLabel}
          value={referrals}
          pct={pct(referrals)}
          fill="pse-gauge-fill--referrals"
          swatch="pse-gauge-swatch--referrals"
        />
        <div className="pse-gauge-divide" />
        <GaugeRow label={totalLabel} value={ceiling} pct="100%" fill="pse-gauge-fill--total" swatch="pse-gauge-swatch--total" total />
      </div>
    </Reveal>
  );
};

/* ── Flow rail ──────────────────────────────────────────────────────────── */

export interface PseFlowStep {
  id: string;
  glyph: PseGlyphName;
  name: string;
  note: string;
  /** A denomination or state marker, where the stage genuinely changes one. */
  denom?: React.ReactNode;
}

/**
 * An ordered sequence drawn as a rail: nodes on one line, a connector laid down
 * segment by segment, and each stage carrying its own glyph. Used for the
 * purchase pipeline, because a sequence that is genuinely ordered should look
 * ordered rather than like a row of cards.
 */
export const FlowRail: React.FC<{ steps: ReadonlyArray<PseFlowStep>; label: string; className?: string }> = ({
  steps,
  label,
  className = '',
}) => (
  <Reveal as="ol" className={`pse-railflow${className ? ` ${className}` : ''}`} delay={60} label={label}>
    {steps.map((step, i) => (
      <li key={step.id} className="pse-railflow-step" style={{ '--pse-i': i } as React.CSSProperties}>
        <span className="pse-railflow-node" aria-hidden="true">
          <PseGlyph name={step.glyph} size={19} />
        </span>
        <span className="pse-railflow-index" aria-hidden="true">
          {String(i + 1).padStart(2, '0')}
        </span>
        <span className="pse-railflow-name">{step.name}</span>
        <span className="pse-railflow-note">{step.note}</span>
        {step.denom && <span className="pse-railflow-denom">{step.denom}</span>}
      </li>
    ))}
  </Reveal>
);

/* ── The equipment specification ────────────────────────────────────────── */

export interface PseTierView {
  tier: number;
  name: string;
  /** Formatted, e.g. `£0.10/hour`. */
  rate: string;
  /** The raw rate, so a tier's capacity can be drawn against the family's. */
  rateValue: number;
  /** Formatted, e.g. `£3.00`. */
  price: string;
  limit: number;
  continuous: boolean;
}

/**
 * The tool family as one equipment specification.
 *
 * Not four cards with different names: ONE panel — a product line, addressed as
 * a financial equipment system — with a bespoke instrument drawn per tier, a
 * capacity column that is proportional across the family, and the price and
 * ownership limit as aligned figures. Below the tablet breakpoint the same
 * markup becomes a horizontal reel of self-contained units, because a spec table
 * squeezed into a phone is not a mobile design.
 */
export const ToolFamily: React.FC<{ tiers: ReadonlyArray<PseTierView>; className?: string }> = ({
  tiers,
  className = '',
}) => {
  const max = Math.max(...tiers.map(t => t.rateValue), 0.0001);

  return (
    <div className={`pse-family${className ? ` ${className}` : ''}`}>
      <div className="pse-family-head" aria-hidden="true">
        <span className="pse-family-head-art">Unit</span>
        <span className="pse-family-head-id">Tier</span>
        <span className="pse-family-head-cap">Capacity</span>
        <span className="pse-family-head-price">Price</span>
        <span className="pse-family-head-limit">Ownership</span>
      </div>

      <ul className="pse-family-list">
        {tiers.map((t, i) => (
          <Reveal
            as="li"
            key={t.tier}
            className="pse-unit"
            delay={i * 60}
            label={`${t.name} — ${t.rate}, ${t.price}, up to ${t.limit} per account`}
          >
            <div className="pse-unit-art">
              <PseTierModule tier={t.tier} continuous={t.continuous} width={150} />
            </div>

            <div className="pse-unit-id">
              <span className="pse-unit-tier">{`Tier ${String(t.tier).padStart(2, '0')}`}</span>
              <h3 className="pse-unit-name">{t.name}</h3>
              <span className="pse-unit-mode" data-mode={t.continuous ? 'continuous' : 'session'}>
                <span className="pse-chip-dot" aria-hidden="true" />
                {t.continuous ? 'Continuous duty' : 'Session duty'}
              </span>
            </div>

            <div className="pse-unit-cap">
              <span className="pse-unit-cap-key">Hourly capacity</span>
              <span className="pse-unit-rate">
                {t.rate.replace('/hour', '')}
                <span className="pse-unit-rate-unit">/hour</span>
              </span>
              <span className="pse-unit-track">
                <span
                  className="pse-unit-fill"
                  data-tier={t.tier}
                  style={{ '--pse-w': `${Math.round((t.rateValue / max) * 100)}%` } as React.CSSProperties}
                />
              </span>
              <span className="pse-unit-share">{`${Math.round((t.rateValue / max) * 100)}% of the family's peak rate`}</span>
            </div>

            <div className="pse-unit-meta">
              <span className="pse-unit-meta-cell">
                <span className="pse-unit-meta-key">Price</span>
                <span className="pse-unit-meta-val">{t.price}</span>
              </span>
              <span className="pse-unit-meta-cell">
                <span className="pse-unit-meta-key">Per account</span>
                <span className="pse-unit-meta-val">{`${t.limit} max`}</span>
              </span>
            </div>
          </Reveal>
        ))}
      </ul>

      {/* The reel has no scrollbar, so it says out loud that it scrolls. */}
      <p className="pse-family-hint">Swipe to compare the four units</p>
    </div>
  );
};

/* ── The hero specimen ──────────────────────────────────────────────────── */

/**
 * The hero specimen: a window of the PSEmine application.
 *
 * This is the product's strongest visual identity, so it is art-directed rather
 * than generic: a title bar with its own state chip, a narrow instrument rail
 * down the left carrying a miniature of every unit in the family, the campaign
 * window and capacity ceiling as financial figures, the capacity instrument
 * itself, and the tier roster along the bottom. One floating tile overlaps its
 * lower edge, which is what makes the console read as a layered product surface
 * rather than a screenshot on a card.
 *
 * It carries a specimen footer because it is an illustration of locked
 * economics, not a readout of an account — and there is nothing personal inside
 * it to mistake.
 */
export const HeroConsole: React.FC<{
  days: number;
  ceiling: number;
  units: number;
  referrals: number;
  tiers: ReadonlyArray<PseTierView>;
}> = ({ days, ceiling, units, referrals, tiers }) => (
  <Reveal className="pse-console-stage" delay={90}>
    <div className="pse-panel pse-panel--instrument pse-console">
      <div className="pse-console-bar">
        <span className="pse-console-lights" aria-hidden="true">
          <i />
          <i />
          <i />
        </span>
        <span className="pse-console-title">PSEmine</span>
        <span className="pse-console-crumb">Campaign</span>
        <span className="pse-chip" data-tone="live">
          <span className="pse-chip-dot" aria-hidden="true" />
          Locked economics
        </span>
      </div>

      <div className="pse-console-body">
        <div className="pse-console-rail" aria-hidden="true">
          {tiers.map(t => (
            <span key={t.tier} className="pse-console-rail-cell">
              <PseTierModule tier={t.tier} continuous={t.continuous} width={30} />
            </span>
          ))}
        </div>

        <div className="pse-console-main">
          <div className="pse-console-fields">
            <div className="pse-console-field">
              <span className="pse-console-key">Campaign window</span>
              <span className="pse-metric pse-metric--sm">
                {days}
                <span className="pse-metric-unit">days</span>
              </span>
            </div>
            <div className="pse-console-field">
              <span className="pse-console-key">Capacity ceiling</span>
              <span className="pse-metric">
                £{ceiling.toFixed(2)}
                <span className="pse-metric-unit">/ hour</span>
              </span>
            </div>
          </div>

          <CapacityInstrument ceiling={ceiling} units={units} referrals={referrals} compact />

          <div className="pse-roster">
            {tiers.map(t => (
              <span key={t.tier} className="pse-roster-cell">
                <PseTierModule tier={t.tier} continuous={t.continuous} width={44} />
                <span className="pse-roster-name">{t.name}</span>
                <span className="pse-roster-rate">{t.rate.replace('/hour', '')}</span>
              </span>
            ))}
          </div>
        </div>
      </div>

      <div className="pse-console-foot">
        <span className="pse-console-foot-dot" aria-hidden="true" />
        Product specimen — PSEmine&apos;s locked economics, not your account.
      </div>
    </div>

    <div className="pse-floatcard">
      <span className="pse-floatcard-key">Operating mode</span>
      <span className="pse-floatcard-row">
        <span className="pse-floatcard-term">Session</span>
        <span className="pse-floatcard-val">Starter · Builder · Advanced</span>
      </span>
      <span className="pse-floatcard-row">
        <span className="pse-floatcard-term">Continuous</span>
        <span className="pse-floatcard-val">Elite</span>
      </span>
    </div>
  </Reveal>
);

/* ── The campaign lifecycle ─────────────────────────────────────────────── */

/**
 * The campaign lifecycle as a rail of tabs.
 *
 * There is deliberately NO "you are here" marker. A public page cannot know a
 * campaign's position, and inventing one would be exactly the fabricated state
 * this product refuses. What the rail *can* do is let a reader step through the
 * phases and read what each one changes, which is true for everyone — so the
 * rail is a real tab set: arrow keys walk it, `aria-selected` states the phase,
 * and the panel below carries the detail.
 */
export const LifecycleRail: React.FC<{
  days: number;
  phases: ReadonlyArray<{ id: string; name: string; note: string; detail: React.ReactNode }>;
  className?: string;
}> = ({ days, phases, className = '' }) => {
  const [active, setActive] = React.useState(0);
  const tabRefs = React.useRef<Array<HTMLButtonElement | null>>([]);

  const move = (delta: number) => {
    const next = (active + delta + phases.length) % phases.length;
    setActive(next);
    tabRefs.current[next]?.focus();
  };

  const onKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'ArrowRight' || event.key === 'ArrowDown') {
      event.preventDefault();
      move(1);
    } else if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') {
      event.preventDefault();
      move(-1);
    } else if (event.key === 'Home') {
      event.preventDefault();
      setActive(0);
      tabRefs.current[0]?.focus();
    } else if (event.key === 'End') {
      event.preventDefault();
      setActive(phases.length - 1);
      tabRefs.current[phases.length - 1]?.focus();
    }
  };

  const current = phases[active];

  return (
    <Reveal className={`pse-lifecycle${className ? ` ${className}` : ''}`}>
      <div className="pse-lifecycle-head">
        <span className="pse-chip">
          <span className="pse-chip-dot" aria-hidden="true" />
          {days}-day campaign
        </span>
        <span className="pse-lifecycle-scale">Dated from launch · accrual only while live</span>
      </div>

      <div className="pse-lifecycle-rail" role="tablist" aria-label="Campaign phases" onKeyDown={onKeyDown}>
        {phases.map((phase, i) => (
          <button
            key={phase.id}
            ref={el => {
              tabRefs.current[i] = el;
            }}
            id={`pse-phase-tab-${phase.id}`}
            type="button"
            role="tab"
            aria-selected={i === active}
            aria-controls={`pse-phase-panel-${phase.id}`}
            tabIndex={i === active ? 0 : -1}
            className="pse-lifecycle-tab"
            data-phase={phase.id}
            style={{ '--pse-i': i } as React.CSSProperties}
            onClick={() => setActive(i)}
          >
            <span className="pse-lifecycle-node" aria-hidden="true" />
            <span className="pse-lifecycle-idx" aria-hidden="true">{String(i + 1).padStart(2, '0')}</span>
            <span className="pse-lifecycle-name">{phase.name}</span>
          </button>
        ))}
      </div>

      <div
        id={`pse-phase-panel-${current.id}`}
        role="tabpanel"
        aria-labelledby={`pse-phase-tab-${current.id}`}
        className="pse-lifecycle-panel"
        data-phase={current.id}
        key={current.id}
      >
        <span className="pse-lifecycle-panel-idx" aria-hidden="true">{String(active + 1).padStart(2, '0')}</span>
        <div className="pse-lifecycle-panel-body">
          <span className="pse-lifecycle-panel-name">{current.name}</span>
          <p className="pse-body pse-measure">{current.detail}</p>
        </div>
        <p className="pse-lifecycle-panel-note">{current.note}</p>
      </div>
    </Reveal>
  );
};

/* ── The purchase console ───────────────────────────────────────────────── */

const NetworkMark: React.FC<{ size?: number }> = ({ size = 18 }) => (
  <svg width={size} height={size} viewBox="0 0 18 18" fill="none" aria-hidden="true" focusable="false">
    <path d="M9 1.6l6.4 7.4L9 12.5 2.6 9 9 1.6Z" fill="var(--pse-bnb)" opacity="0.85" />
    <path d="M9 13.9l6.4-3.5L9 16.4 2.6 10.4 9 13.9Z" fill="var(--pse-bnb)" opacity="0.5" />
  </svg>
);

/**
 * The payment specimen: a purchase as a modern wallet flow presents it.
 *
 * The amount hierarchy is the point — the price is fixed and stated in GBP, the
 * BNB amount is honestly described as issued per quote rather than printed as a
 * number nobody has been given, and the network and asset carry their own
 * identity. The status rail names the four real states of a purchase; the first
 * is marked as the specimen's, because a specimen is at the moment it shows and
 * at no other. The only control on it is a real link into the product, so the
 * specimen never contains a dead button.
 */
export const PaymentConsole: React.FC<{
  tier: PseTierView;
  network: string;
  asset: string;
}> = ({ tier, network, asset }) => (
  <Reveal className="pse-pay" delay={80}>
    <div className="pse-pay-bar">
      <span className="pse-pay-bar-title">Purchase</span>
      <span className="pse-pay-bar-id">Unit · {tier.name}</span>
      <span className="pse-chip" data-tone="bnb">
        <span className="pse-chip-dot" aria-hidden="true" />
        {asset}
      </span>
    </div>

    <div className="pse-pay-body">
      <div className="pse-pay-unit">
        <span className="pse-pay-unit-art">
          <PseTierModule tier={tier.tier} continuous={tier.continuous} width={78} />
        </span>
        <span className="pse-pay-unit-id">
          <span className="pse-micro">{`Tier ${String(tier.tier).padStart(2, '0')}`}</span>
          <span className="pse-h3">{tier.name}</span>
          <span className="pse-pay-unit-rate">{`${tier.rate} · ${tier.continuous ? 'continuous' : 'session'} duty`}</span>
        </span>
      </div>

      <div className="pse-pay-amount">
        <div className="pse-pay-amount-side">
          <span className="pse-micro">Price · fixed</span>
          <span className="pse-metric">{tier.price}</span>
          <span className="pse-pay-amount-note">Set in GBP. It does not move with the market.</span>
        </div>

        <span className="pse-pay-amount-link" aria-hidden="true">
          <span className="pse-pay-amount-line" />
          <span className="pse-pay-amount-rate">quoted rate</span>
          <span className="pse-pay-amount-line" />
        </span>

        <div className="pse-pay-amount-side">
          <span className="pse-micro">Amount · {asset}</span>
          <span className="pse-metric pse-pay-amount-quoted">—</span>
          <span className="pse-pay-amount-note">Issued per quote: the exact amount at the rate of that quote, with a time limit.</span>
        </div>
      </div>

      <div className="pse-pay-net">
        <span className="pse-pay-net-mark">
          <NetworkMark />
        </span>
        <span className="pse-pay-net-id">
          <span className="pse-pay-net-name">{network}</span>
          <span className="pse-pay-net-note">You send from your own wallet. PSEmine never holds your keys.</span>
        </span>
      </div>

      <ol className="pse-pay-states" aria-label="The four states of a PSEmine purchase">
        {['Quoted', 'Awaiting payment', 'Confirmed on-chain', 'Unit activated'].map((state, i) => (
          <li key={state} className="pse-pay-state" data-active={i === 0 ? 'true' : undefined}>
            <span className="pse-pay-state-node" aria-hidden="true" />
            <span className="pse-pay-state-name">{state}</span>
          </li>
        ))}
      </ol>
    </div>

    <div className="pse-pay-foot">
      <Link className="pse-btn pse-btn--block" to="/mine/signup">
        Open an account for a quote
        <span className="pse-btn-arrow" aria-hidden="true">
          →
        </span>
      </Link>
      <span className="pse-pay-foot-note">Illustration of the purchase flow — not a live quote.</span>
    </div>
  </Reveal>
);

/* ── The settlement statement ───────────────────────────────────────────── */

/**
 * Settlement presented as a statement rather than a paragraph: the denomination
 * change drawn once down the left, and the four stages addressed as rows with
 * their unit and their meaning aligned. It is the one place in the product where
 * the unit a figure is denominated in changes, and the surface says so.
 */
export const StatementPanel: React.FC<{
  steps: ReadonlyArray<{ id: string; glyph: PseGlyphName; name: string; unit: string; note: string; terminal?: boolean }>;
  className?: string;
}> = ({ steps, className = '' }) => (
  <Reveal className={`pse-statement${className ? ` ${className}` : ''}`} delay={60}>
    <div className="pse-statement-side">
      <span className="pse-statement-unit" data-unit="gbp">
        GBP
      </span>
      <span className="pse-statement-wire" aria-hidden="true">
        <span className="pse-statement-wire-line" />
        <span className="pse-statement-wire-swap">settlement</span>
        <span className="pse-statement-wire-line" />
      </span>
      <span className="pse-statement-unit" data-unit="bnb">
        BNB
      </span>
      <span className="pse-statement-side-note">
        Accrual and settlement are denominated in GBP. Payout is denominated in BNB. The unit changes exactly once, and
        the change is settlement.
      </span>
    </div>

    <div className="pse-statement-table">
      <div className="pse-statement-head" aria-hidden="true">
        <span />
        <span>Stage</span>
        <span>Unit</span>
        <span>What happens</span>
      </div>
      <ol className="pse-statement-rows">
        {steps.map(step => (
          <li key={step.id} className="pse-statement-row" data-terminal={step.terminal ? 'true' : undefined}>
            <span className="pse-statement-glyph">
              <PseGlyph name={step.glyph} size={18} />
            </span>
            <span className="pse-statement-name">{step.name}</span>
            <span className="pse-statement-unit-tag">{step.unit}</span>
            <span className="pse-statement-note">{step.note}</span>
          </li>
        ))}
      </ol>
    </div>
  </Reveal>
);

/* ── The trust map ──────────────────────────────────────────────────────── */

/**
 * Security drawn as a relationship map: one account record at the centre, four
 * properties wired to it. A grid of four blocks says "four features"; a map says
 * "four properties of one system", which is the actual claim.
 */
export const TrustMap: React.FC<{
  items: ReadonlyArray<{ glyph: PseGlyphName; name: string; note: string }>;
  className?: string;
}> = ({ items, className = '' }) => (
  <Reveal className={`pse-trustmap${className ? ` ${className}` : ''}`} delay={60}>
    <div className="pse-trustmap-core">
      <span className="pse-trustmap-core-art" aria-hidden="true">
        <PseTierModule tier={4} continuous width={54} />
      </span>
      <span className="pse-trustmap-core-id">
        <span className="pse-trustmap-core-name">Your account record</span>
        <span className="pse-trustmap-core-note">Capacity, purchases and accrual, written server-side</span>
      </span>
    </div>

    <ul className="pse-trustmap-items">
      {items.map(item => (
        <li key={item.name} className="pse-trustmap-item">
          <span className="pse-trustmap-item-glyph">
            <PseGlyph name={item.glyph} size={16} />
          </span>
          <span className="pse-trustmap-item-name">{item.name}</span>
          <span className="pse-trustmap-item-note">{item.note}</span>
        </li>
      ))}
    </ul>
  </Reveal>
);
