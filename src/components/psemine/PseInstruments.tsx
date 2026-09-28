/**
 * PSEmine instruments — the objects the public product is actually made of.
 *
 * WHY THIS FILE EXISTS
 * A page assembled from headings, paragraphs and separators reads as a document
 * however well it is typeset. This product is a financial instrument, so its
 * public page is built from *instruments*: a capacity gauge, a lifecycle rail,
 * ordered pipelines, an application specimen and compact financial stat blocks.
 * Prose still carries the argument, but every section also contains a real
 * object that says the same thing faster.
 *
 * WHAT IS DELIBERATELY ABSENT
 * None of these instruments reads an account. They are constructed from the
 * product's locked economics (prices, rates, limits, ceilings, the campaign
 * length, the payment asset) and from nothing else: no balance, no position, no
 * countdown, no address, no status, no progress that claims to know where a
 * visitor is. A specimen is labelled as a specimen.
 *
 * MOTION
 * `Reveal` arms a one-shot entrance through an IntersectionObserver. Elements
 * are visible by default and only become hidden when the observer is present, so
 * a failed observer can never leave the page blank; and the reduced-motion
 * rules in psemine.css mean a reader who asks for less motion sees everything
 * immediately, with the gauges already at their true values.
 *
 * THE MOTION RULE: it explains hierarchy. A gauge fills once so you read it as a
 * measurement; a rail draws once so you read it as a sequence; a panel lifts on
 * hover so you know it is a surface. Nothing loops, nothing counts, nothing
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

export const StatGrid: React.FC<{ cols?: 3 | 4; children: React.ReactNode; className?: string }> = ({
  cols = 4,
  children,
  className = '',
}) => <div className={`pse-stats pse-stats--${cols}${className ? ` ${className}` : ''}`}>{children}</div>;

/* ── Capacity gauge ─────────────────────────────────────────────────────── */

/**
 * The capacity instrument.
 *
 * Every row is drawn against ONE shared track, so the three rows are
 * proportional to the same maximum and can be read against each other — which is
 * the whole point of an instrument. The stacked bar on top states the
 * composition in a single object: units plus qualified referrals, and no more.
 */
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

export const CapacityGauge: React.FC<{
  /** The ceiling in £/hour, and the denominator for every row. */
  ceiling: number;
  units: number;
  referrals: number;
  unitLabel?: string;
  referralLabel?: string;
  totalLabel?: string;
  className?: string;
}> = ({
  ceiling,
  units,
  referrals,
  unitLabel = 'Unit capacity',
  referralLabel = 'Referral capacity',
  totalLabel = 'Total capacity',
  className = '',
}) => {
  const pct = (v: number) => `${Math.max(0, Math.min(100, (v / ceiling) * 100))}%`;

  return (
    <Reveal className={`pse-gauge${className ? ` ${className}` : ''}`}>
      <div className="pse-gauge-stack">
        <span className="pse-gauge-seg pse-gauge-seg--units" style={{ '--pse-w': pct(units) } as React.CSSProperties} />
        <span
          className="pse-gauge-seg pse-gauge-seg--referrals"
          style={{ '--pse-w': pct(referrals) } as React.CSSProperties}
        />
      </div>

      <div className="pse-gauge-rows">
        <GaugeRow label={unitLabel} value={units} pct={pct(units)} fill="pse-gauge-fill--units" />
        <GaugeRow label={referralLabel} value={referrals} pct={pct(referrals)} fill="pse-gauge-fill--referrals" swatch="pse-gauge-swatch--referrals" />
        <div className="pse-gauge-divide" />
        <GaugeRow label={totalLabel} value={ceiling} pct="100%" fill="pse-gauge-fill--total" swatch="pse-gauge-swatch--total" total />
      </div>
    </Reveal>
  );
};

/* ── Campaign rail ──────────────────────────────────────────────────────── */

/**
 * The campaign lifecycle as a rail with nodes.
 *
 * There is deliberately NO "you are here" marker. A public page cannot know a
 * campaign's position, and inventing one would be exactly the fabricated state
 * this product refuses. The instrument therefore states the phases and their
 * order — which is the part that is true for everyone.
 */
export const CampaignRail: React.FC<{
  days: number;
  phases: ReadonlyArray<{ id: string; name: string; note: string }>;
  className?: string;
}> = ({ days, phases, className = '' }) => (
  <Reveal className={`pse-rail${className ? ` ${className}` : ''}`}>
    <div className="pse-rail-head">
      <span className="pse-chip">{days}-day campaign</span>
      <span className="pse-rail-scale">Dated from launch · accrual only while live</span>
    </div>

    <ol className="pse-rail-steps">
      {phases.map((phase, i) => (
        <li
          key={phase.id}
          className="pse-rail-step"
          data-phase={phase.id}
          style={{ '--pse-i': i } as React.CSSProperties}
        >
          <span className="pse-rail-node" aria-hidden="true" />
          <span className="pse-rail-name">{phase.name}</span>
          <span className="pse-rail-note">{phase.note}</span>
        </li>
      ))}
    </ol>
  </Reveal>
);

/* ── Pipeline ───────────────────────────────────────────────────────────── */

export interface PseFlowStep {
  id: string;
  glyph: PseGlyphName;
  name: string;
  note: string;
  /** A denomination or state marker, where the stage genuinely changes one. */
  denom?: React.ReactNode;
}

/** An ordered sequence with connectors — a purchase, or a settlement lifecycle. */
export const FlowPipeline: React.FC<{ steps: ReadonlyArray<PseFlowStep>; label: string; className?: string }> = ({
  steps,
  label,
  className = '',
}) => (
  <Reveal as="ol" className={`pse-flow${className ? ` ${className}` : ''}`} delay={60} label={label}>
    {steps.map((step, i) => (
      <li key={step.id} className="pse-flow-step">
        <span className="pse-flow-top">
          <span className="pse-flow-glyph">
            <PseGlyph name={step.glyph} />
          </span>
          <span className="pse-flow-index" aria-hidden="true">
            {String(i + 1).padStart(2, '0')}
          </span>
        </span>
        <span className="pse-flow-name">{step.name}</span>
        <span className="pse-flow-note">{step.note}</span>
        {step.denom && <span className="pse-flow-denom">{step.denom}</span>}
      </li>
    ))}
  </Reveal>
);

/* ── Specimens ──────────────────────────────────────────────────────────── */

export interface PseTierView {
  tier: number;
  name: string;
  /** Formatted, e.g. `£0.10/hour`. */
  rate: string;
  /** Formatted, e.g. `£3.00`. */
  price: string;
  limit: number;
  continuous: boolean;
}

/**
 * The hero specimen: a window of the PSEmine application.
 *
 * It shows the campaign length, the capacity ceiling, the instrument that
 * composes it, and the tier roster — the product's own structure, at a glance,
 * in the shape of the interface that actually presents it. It carries a specimen
 * footer because it is an illustration of locked economics, not a readout of an
 * account, and there is nothing personal inside it to mistake.
 */
export const HeroSpecimen: React.FC<{
  days: number;
  ceiling: number;
  units: number;
  referrals: number;
  tiers: ReadonlyArray<PseTierView>;
}> = ({ days, ceiling, units, referrals, tiers }) => (
  <Reveal className="pse-panel pse-panel--instrument pse-spec" delay={90}>
    <div className="pse-spec-bar">
      <span className="pse-spec-lights" aria-hidden="true">
        <i />
        <i />
        <i />
      </span>
      <span className="pse-spec-title">PSEmine</span>
      <span className="pse-chip" data-tone="live" style={{ marginLeft: 'auto' }}>
        <span className="pse-chip-dot" aria-hidden="true" />
        Locked economics
      </span>
    </div>

    <div className="pse-spec-body">
      <div className="pse-spec-pair">
        <div className="pse-spec-field">
          <span className="pse-spec-field-key">Campaign</span>
          <span className="pse-metric pse-metric--sm">
            {days}
            <span className="pse-metric-unit">days</span>
          </span>
        </div>
        <div className="pse-spec-field">
          <span className="pse-spec-field-key">Capacity ceiling</span>
          <span className="pse-metric">
            £{ceiling.toFixed(2)}
            <span className="pse-metric-unit">/ hour</span>
          </span>
        </div>
      </div>

      <CapacityGauge ceiling={ceiling} units={units} referrals={referrals} />

      <div className="pse-spec-roster">
        {tiers.map(t => (
          <span key={t.tier} className="pse-spec-cell">
            <PseTierModule tier={t.tier} continuous={t.continuous} width={62} />
            <span className="pse-spec-cell-name">{t.name}</span>
            <span className="pse-spec-cell-rate">{t.rate}</span>
          </span>
        ))}
      </div>
    </div>

    <div className="pse-panel-foot">
      <span className="pse-small">
        Product specimen — PSEmine&apos;s locked economics, not your account.
      </span>
    </div>
  </Reveal>
);

/**
 * The payment specimen: a purchase as the wallet flow presents it. The asset and
 * the network are stated, the amount is honestly described as quoted rather than
 * printed as a number nobody has been given, and the only control on it is a real
 * link into the product — the specimen never contains a dead button.
 */
export const PaymentSpecimen: React.FC<{
  unitName: string;
  price: string;
  network: string;
  asset: string;
}> = ({ unitName, price, network, asset }) => (
  <Reveal className="pse-panel pse-panel--raised pse-spec" delay={90}>
    <div className="pse-spec-bar">
      <span className="pse-spec-title">Purchase</span>
      <span className="pse-chip" data-tone="bnb" style={{ marginLeft: 'auto' }}>
        <span className="pse-chip-dot" aria-hidden="true" />
        {asset}
      </span>
    </div>

    <div className="pse-spec-body">
      <div className="pse-spec-field">
        <span className="pse-spec-field-key">Unit</span>
        <span className="pse-h3">{unitName}</span>
      </div>

      <div className="pse-spec-field">
        <span className="pse-spec-field-key">Price</span>
        <span className="pse-metric">{price}</span>
      </div>

      <StatGrid cols={3}>
        <Stat label="Asset" value={asset} />
        <Stat label="Network" value={network} note="Settlement asset" />
        <Stat label="Amount" value="Quoted" note="Exact BNB at the quoted rate" />
      </StatGrid>

      <div className="pse-spec-field">
        <span className="pse-spec-field-key">Quote</span>
        <span className="pse-small">
          A quote is issued per purchase and is time-limited; it prints the address to pay and stops being valid when it
          expires.
        </span>
      </div>
    </div>

    <div className="pse-panel-foot" style={{ display: 'grid', gap: '0.6rem' }}>
      <Link className="pse-btn pse-btn--block" to="/mine/signup">
        Open an account for a quote
        <span className="pse-btn-arrow" aria-hidden="true">
          →
        </span>
      </Link>
      <span className="pse-small">Illustration of the purchase flow — not a live quote.</span>
    </div>
  </Reveal>
);

/* ── Trust grid ─────────────────────────────────────────────────────────── */

export const TrustGrid: React.FC<{
  items: ReadonlyArray<{ glyph: PseGlyphName; name: string; note: string }>;
  className?: string;
}> = ({ items, className = '' }) => (
  <Reveal className={`pse-trust${className ? ` ${className}` : ''}`} delay={60}>
    {items.map(item => (
      <div key={item.name} className="pse-trust-item">
        <span className="pse-trust-glyph">
          <PseGlyph name={item.glyph} size={17} />
        </span>
        <span className="pse-trust-name">{item.name}</span>
        <span className="pse-trust-note">{item.note}</span>
      </div>
    ))}
  </Reveal>
);
