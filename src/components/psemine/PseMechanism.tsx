/**
 * PSEmine product art — the drawn vocabulary of the product.
 *
 * ART DIRECTION: THE INSTRUMENT PLATE.
 * PSEmine is a capacity instrument, so its artwork is drawn the way an
 * instrument is drawn: a shared datum, dimension lines, a tick ladder, and a
 * monospace reading. Three families live here, all specific to PSEmine, all
 * drawn rather than borrowed from an icon set or a photograph:
 *
 * 1. GLYPHS (`PseGlyph`)
 *    One idea per glyph, 24×24, one stroke weight. They label the stages of a
 *    pipeline and the claims on the trust map. Each draws exactly what it names,
 *    because a sequence reads faster when the marks are literal: a quote, a
 *    wallet, a verification, an activation; accrual, settlement, review, a
 *    payout; a server, a chain, an audit trail, a shield.
 *
 * 2. THE EQUIPMENT FAMILY (`PseTierModule`)
 *    Four engineered instruments on one 132×104 plate. Every unit shares the
 *    same grammar — a plinth on one datum, a calibration rail up the left edge,
 *    a capacity mast up the right edge, and a dimension line carrying the unit's
 *    price — and differs by SILHOUETTE and TOPOLOGY:
 *
 *      Starter   a low chassis with a single working slot
 *      Builder   two stacked stages in a taller frame
 *      Advanced  a 2×2 lattice, wider than it is tall, in restrained violet
 *      Elite     the tallest frame: a full-width header bank over four columns,
 *                plus the continuous-duty crest in cyan
 *
 *    Silhouette and cell topology carry the tier — not four hues — so the
 *    difference holds at 30px, in monochrome, and for a colour-blind reader.
 *
 * 3. THE INSTRUMENTS (`PseOperatingSignature`, `PseScale`)
 *    The operating-signature chart and the scale ladder. The chart draws the one
 *    thing that actually distinguishes a session unit from a continuous one: the
 *    shape of its accrual. The ladder is the axis every capacity figure in the
 *    product is read against.
 *
 * HONESTY. Nothing here is a readout. No glyph carries a number, a live state or
 * progress, because none of them knows anything about a particular visitor. A
 * cell's fill marks which part of the instrument is *active*, never how much of
 * anything a person holds. The chart is labelled illustrative and is drawn from
 * the product's operating models, not from a forecast.
 */
import React from 'react';

/* ═══════════════════ GLYPHS ═══════════════════ */

export type PseGlyphName =
  | 'select' | 'wallet' | 'verify' | 'activate'
  | 'accrue' | 'settle' | 'review' | 'payout'
  | 'server' | 'chain' | 'audit' | 'shield';

const S = 'currentColor';
const A = 'var(--pse-accent)';
const C = 'var(--pse-cyan)';

/** 24×24, one stroke weight, round joins. `aria-hidden` — the label is the text. */
export const PseGlyph: React.FC<{ name: PseGlyphName; size?: number; className?: string }> = ({
  name,
  size = 22,
  className,
}) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    aria-hidden="true"
    focusable="false"
    shapeRendering="geometricPrecision"
    className={className}
  >
    {name === 'select' && (
      <>
        <rect x="3.5" y="3.5" width="7.5" height="7.5" rx="2" stroke={S} strokeWidth="1.3" opacity="0.45" />
        <rect x="13" y="3.5" width="7.5" height="7.5" rx="2" stroke={S} strokeWidth="1.3" opacity="0.45" />
        <rect x="3.5" y="13" width="7.5" height="7.5" rx="2" stroke={S} strokeWidth="1.3" opacity="0.45" />
        <rect x="13" y="13" width="7.5" height="7.5" rx="2" fill={A} />
      </>
    )}

    {name === 'wallet' && (
      <>
        <path
          d="M3.5 8.2c0-1 .8-1.7 1.7-1.7h11.6c1 0 1.7.8 1.7 1.7v7.6c0 1-.8 1.7-1.7 1.7H5.2c-1 0-1.7-.8-1.7-1.7V8.2Z"
          stroke={S}
          strokeWidth="1.3"
        />
        <path d="M3.5 10.5h17" stroke={S} strokeWidth="1.3" opacity="0.35" />
        <circle cx="16.4" cy="14.4" r="1.7" fill={A} />
      </>
    )}

    {name === 'verify' && (
      <>
        <path
          d="M12 3.2l7 2.6v5.4c0 4-2.9 7.4-7 8.9-4.1-1.5-7-4.9-7-8.9V5.8l7-2.6Z"
          stroke={S}
          strokeWidth="1.3"
          strokeLinejoin="round"
        />
        <path d="M8.8 11.9l2.3 2.3 4.2-4.4" stroke={A} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
      </>
    )}

    {name === 'activate' && (
      <>
        <circle cx="12" cy="12" r="8.2" stroke={S} strokeWidth="1.3" />
        <path d="M12 7.4v5.2" stroke={A} strokeWidth="1.6" strokeLinecap="round" />
        <path d="M8.4 10.4a5 5 0 1 0 7.2 0" stroke={S} strokeWidth="1.3" strokeLinecap="round" opacity="0.4" />
      </>
    )}

    {name === 'accrue' && (
      <>
        <path d="M3.5 20.5h17" stroke={S} strokeWidth="1.3" strokeLinecap="round" opacity="0.3" />
        <rect x="5" y="14.5" width="3.4" height="6" rx="1" fill={S} opacity="0.3" />
        <rect x="10.3" y="10.5" width="3.4" height="10" rx="1" fill={S} opacity="0.5" />
        <rect x="15.6" y="5.5" width="3.4" height="15" rx="1" fill={A} />
      </>
    )}

    {name === 'settle' && (
      <>
        <path d="M3.5 8.5h11M3.5 15.5h11" stroke={S} strokeWidth="1.3" strokeLinecap="round" opacity="0.35" />
        <path d="M14.5 8.5h2.2a3.5 3.5 0 0 1 3.5 3.5M14.5 15.5h2.2a3.5 3.5 0 0 0 3.5-3.5" stroke={S} strokeWidth="1.3" opacity="0.5" />
        <path d="M19.2 12h1.8" stroke={A} strokeWidth="1.7" strokeLinecap="round" />
      </>
    )}

    {name === 'review' && (
      <>
        <path d="M2.8 12S5.8 6.8 12 6.8 21.2 12 21.2 12 18.2 17.2 12 17.2 2.8 12 2.8 12Z" stroke={S} strokeWidth="1.3" strokeLinejoin="round" opacity="0.5" />
        <circle cx="12" cy="12" r="2.9" stroke={A} strokeWidth="1.5" />
        <path d="M14.4 14.4l3.2 3.2" stroke={S} strokeWidth="1.3" strokeLinecap="round" opacity="0.55" />
      </>
    )}

    {name === 'payout' && (
      <>
        <path d="M3.5 7.5h11.5v9H3.5z" stroke={S} strokeWidth="1.3" strokeLinejoin="round" opacity="0.5" />
        <circle cx="7.6" cy="12" r="1.5" fill={S} opacity="0.4" />
        <path d="M14 12h6.5" stroke={C} strokeWidth="1.6" strokeLinecap="round" />
        <path d="M17.6 8.9L20.9 12l-3.3 3.1" stroke={C} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
      </>
    )}

    {name === 'server' && (
      <>
        <rect x="3.5" y="4" width="17" height="6" rx="2" stroke={S} strokeWidth="1.3" />
        <rect x="3.5" y="14" width="17" height="6" rx="2" stroke={S} strokeWidth="1.3" opacity="0.5" />
        <circle cx="7.2" cy="7" r="1.1" fill={A} />
        <circle cx="7.2" cy="17" r="1.1" fill={S} opacity="0.35" />
        <path d="M12 7h5M12 17h5" stroke={S} strokeWidth="1.2" strokeLinecap="round" opacity="0.3" />
      </>
    )}

    {name === 'chain' && (
      <>
        <rect x="3.5" y="8.5" width="8.5" height="7" rx="2" stroke={S} strokeWidth="1.3" opacity="0.5" />
        <rect x="12" y="8.5" width="8.5" height="7" rx="2" stroke={S} strokeWidth="1.3" />
        <path d="M9.5 12h5" stroke={A} strokeWidth="1.6" strokeLinecap="round" />
        <path d="M12 3.4v2.6M12 18v2.6" stroke={S} strokeWidth="1.2" strokeLinecap="round" opacity="0.3" />
      </>
    )}

    {name === 'audit' && (
      <>
        <path d="M5 3.5h9l5 5v12H5z" stroke={S} strokeWidth="1.3" strokeLinejoin="round" />
        <path d="M14 3.5v5h5" stroke={S} strokeWidth="1.3" strokeLinejoin="round" opacity="0.4" />
        <path d="M8.2 15.2l1.8 1.8 3.6-3.8" stroke={A} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
      </>
    )}

    {name === 'shield' && (
      <>
        <path
          d="M12 3.2l7.5 2.8v5.2c0 4.2-3.1 7.8-7.5 9.4-4.4-1.6-7.5-5.2-7.5-9.4V6l7.5-2.8Z"
          stroke={S}
          strokeWidth="1.3"
          strokeLinejoin="round"
        />
        <path d="M12 8.4v4.2M12 15.4v.1" stroke={A} strokeWidth="1.7" strokeLinecap="round" />
      </>
    )}
  </svg>
);

/* ═══════════════════ THE EQUIPMENT FAMILY ═══════════════════ */

/**
 * One plate for the whole family.
 *
 * 132 × 112, with the floor at y=84 so all four units stand on the same datum
 * and can be laid side by side as one specification. The left margin holds the
 * calibration rail, the right margin the capacity mast, the strip below the
 * plinth holds the dimension line, and 5 units of depth are reserved on the
 * right and below for the extrusion.
 */
const GRID_W = 132;
/** The plate reserves the strip below the plinth for the dimension line. */
const GRID_H = 112;
/** A `mark` carries no dimension line, so it is cut to the machine itself. */
const MARK_H = 100;
const FLOOR = 84;
const PLINTH = { x: 16, y: FLOOR, w: 100, h: 8 };
/** The mast: one column on the right edge, filled proportionally to the tier. */
const MAST = { x: 113, w: 10, top: 26, base: FLOOR };
/** Extrusion depth — the family is drawn as solid instruments, not outlines. */
const DEPTH = 5;

const ACCENT = 'var(--pse-accent)';
const CYAN = 'var(--pse-cyan)';
const VIOLET = 'var(--pse-violet)';
/** Faces. Defined by the art layer so the plate follows the product surface. */
const FACE = 'var(--pse-equip-face, rgba(255,255,255,0.02))';
const SIDE = 'var(--pse-equip-side, rgba(255,255,255,0.055))';
const TOP = 'var(--pse-equip-top, rgba(255,255,255,0.10))';

interface PseCell {
  x: number;
  y: number;
  w: number;
  h: number;
  fill: string;
  opacity?: number;
  /** The cell the tier is "about" — the only one that brightens on hover. */
  key?: boolean;
}

interface PseEquipProfile {
  /** The instrument frame: taller and wider as the tier rises. */
  frame: { x: number; y: number; w: number; h: number };
  /** The working cells inside the frame. */
  cells: ReadonlyArray<PseCell>;
  /** Elite only: the continuous-duty crest, drawn above the frame. */
  crest?: { x: number; w: number };
}

/**
 * The four profiles. Read them as one family: the frame grows, the cells
 * multiply, and the last one gains a crest. Every tier's mast fill is a real
 * ratio of the family's peak rate, so the plate states the spread between a
 * £0.10/h unit and a £2.50/h unit rather than implying the four are close.
 */
const EQUIPMENT: Record<number, PseEquipProfile> = {
  1: {
    frame: { x: 30, y: 56, w: 52, h: 28 },
    cells: [{ x: 36, y: 63, w: 40, h: 14, fill: ACCENT, key: true }],
  },
  2: {
    frame: { x: 28, y: 34, w: 56, h: 50 },
    cells: [
      { x: 34, y: 40, w: 44, h: 18, fill: ACCENT, opacity: 0.55 },
      { x: 34, y: 62, w: 44, h: 16, fill: ACCENT, key: true },
    ],
  },
  3: {
    frame: { x: 26, y: 26, w: 60, h: 58 },
    cells: [
      { x: 32, y: 32, w: 25, h: 23, fill: ACCENT, key: true },
      { x: 59, y: 32, w: 25, h: 23, fill: VIOLET, opacity: 0.85 },
      { x: 32, y: 59, w: 25, h: 23, fill: ACCENT, opacity: 0.7 },
      { x: 59, y: 59, w: 25, h: 23, fill: VIOLET, opacity: 0.5 },
    ],
  },
  4: {
    frame: { x: 24, y: 18, w: 64, h: 66 },
    crest: { x: 40, w: 32 },
    cells: [
      { x: 30, y: 24, w: 52, h: 16, fill: ACCENT, key: true },
      { x: 30, y: 46, w: 11, h: 34, fill: ACCENT, opacity: 0.82 },
      { x: 44, y: 46, w: 11, h: 34, fill: ACCENT, opacity: 0.64 },
      { x: 58, y: 46, w: 11, h: 34, fill: CYAN, opacity: 0.82 },
      { x: 72, y: 46, w: 11, h: 34, fill: CYAN },
    ],
  },
};

/** How full each tier's mast is, as a fraction of the family's peak rate. */
const MAST_FILL: Record<number, number> = { 1: 0.06, 2: 0.22, 3: 0.5, 4: 1 };
const MAST_COLOR: Record<number, string> = { 1: ACCENT, 2: ACCENT, 3: VIOLET, 4: CYAN };

/** The price printed on each unit's dimension line. */
const PRICE: Record<number, string> = { 1: '£3', 2: '£10', 3: '£50', 4: '£200' };

/**
 * The shared chassis: datum, plinth, calibration rail, capacity mast and the
 * dimension line. Drawn for every tier so the four read as one product line.
 */
const PseEquipChassis: React.FC<{ tier: number; showDimension: boolean }> = ({ tier, showDimension }) => {
  const ratio = MAST_FILL[tier] ?? 0.04;
  const mastTop = MAST.base - (MAST.base - MAST.top) * ratio;
  const plinthRight = PLINTH.x + PLINTH.w;
  /* The dimension line, and the gap it leaves for its own label. */
  const dimY = FLOOR + PLINTH.h + 11;
  const dimMid = (PLINTH.x + plinthRight) / 2;
  const dimGap = 27;

  return (
    <>
      {/* Plinth and its two feet — one floor for the whole family. */}
      <rect x={PLINTH.x} y={PLINTH.y} width={PLINTH.w} height={PLINTH.h} rx="2.5" fill={FACE} stroke={S} strokeWidth="1" opacity="0.5" />
      <path
        d={`M${PLINTH.x + 10} ${FLOOR + PLINTH.h}v5M${plinthRight - 10} ${FLOOR + PLINTH.h}v5`}
        stroke={S}
        strokeWidth="1.1"
        strokeLinecap="round"
        opacity="0.3"
      />

      {/* Calibration rail with four ticks — the family's left edge. */}
      <path d={`M13 ${MAST.top + 6}v${FLOOR - MAST.top - 6}`} stroke={S} strokeWidth="1" strokeLinecap="round" opacity="0.24" />
      <path
        d={`M13 40h5M13 54h5M13 68h4M13 80h3`}
        stroke={S}
        strokeWidth="1"
        strokeLinecap="round"
        opacity="0.34"
      />

      {/* Capacity mast — one scale for the family, filled to the tier's real rate. */}
      <path
        d={`M${MAST.x + MAST.w / 2} ${MAST.top - 6}v4M${MAST.x + MAST.w / 2} ${MAST.base}v4`}
        stroke={S}
        strokeWidth="1"
        strokeLinecap="round"
        opacity="0.28"
      />
      <rect x={MAST.x} y={MAST.top} width={MAST.w} height={MAST.base - MAST.top} rx="2" fill={FACE} stroke={S} strokeWidth="1" opacity="0.34" />
      <rect
        className="pse-equip-mast"
        x={MAST.x + 1.5}
        y={mastTop + 1.5}
        width={MAST.w - 3}
        height={Math.max(5, MAST.base - mastTop - 3)}
        rx="1.5"
        fill={MAST_COLOR[tier] ?? ACCENT}
        opacity={0.55 + ratio * 0.45}
      />

      {/* The dimension line carries the price: the drawing states what the unit
          costs. Its two segments stop short of the label, the way a dimension is
          drawn, so the line never strikes through its own reading. */}
      {showDimension && (
        <g className="pse-equip-dim">
          <path
            d={`M${PLINTH.x} ${dimY}h${dimMid - dimGap - PLINTH.x}`}
            stroke={S}
            strokeWidth="1"
            strokeLinecap="butt"
            opacity="0.34"
          />
          <path
            d={`M${dimMid + dimGap} ${dimY}h${plinthRight - dimMid - dimGap}`}
            stroke={S}
            strokeWidth="1"
            strokeLinecap="butt"
            opacity="0.34"
          />
          <path
            d={`M${PLINTH.x} ${dimY - 4}v8M${plinthRight} ${dimY - 4}v8`}
            stroke={S}
            strokeWidth="1"
            strokeLinecap="round"
            opacity="0.5"
          />
          <text
            className="pse-equip-price"
            x={dimMid}
            y={dimY}
            textAnchor="middle"
            dominantBaseline="central"
            fill={S}
            opacity="0.8"
          >
            {PRICE[tier] ?? ''}
          </text>
        </g>
      )}
    </>
  );
};

/**
 * One drawn mining unit.
 *
 * The tier is carried by the frame, the mast and the cell topology — so the four
 * belong to one product line and the difference survives at 30px, in monochrome,
 * and without colour.
 *
 * The variant follows the SIZE, because the drawing has to change what it says
 * at small sizes rather than merely shrink: at 132px and above it is the full
 * engineering plate — extrusion, calibration rail, dimension line and price. The
 * moment it is asked for less than that it becomes a `mark`, dropping the
 * extrusion and the dimension line so the silhouette does the whole job instead
 * of five pixels of unreadable annotation pretending to.
 */
export const PseTierModule: React.FC<{
  tier: number;
  /** Continuous-operation tier (Elite). Draws the crest. */
  continuous?: boolean;
  width?: number;
  /** Defaults to `auto`, which picks `plate` above 132px and `mark` below it. */
  variant?: 'auto' | 'plate' | 'mark';
  className?: string;
}> = ({ tier, continuous = false, width = 150, variant = 'auto', className }) => {
  const t = Math.min(4, Math.max(1, tier));
  const profile = EQUIPMENT[t] ?? EQUIPMENT[1];
  const plate = variant === 'mark' ? false : variant === 'plate' ? true : width >= 132;
  const f = profile.frame;

  /* The extrusion: a top face and a side face, both darker than the front. */
  const side = `M${f.x + f.w} ${f.y} l${DEPTH} ${DEPTH} v${f.h} l${-DEPTH} ${-DEPTH} Z`;
  const topFace = `M${f.x} ${f.y} l${DEPTH} ${-DEPTH} h${f.w} l${-DEPTH} ${DEPTH} Z`;

  return (
    <svg
      width={width}
      height={(width * (plate ? GRID_H : MARK_H)) / GRID_W}
      viewBox={`0 0 ${GRID_W} ${plate ? GRID_H : MARK_H}`}
      fill="none"
      aria-hidden="true"
      focusable="false"
      shapeRendering="geometricPrecision"
      className={`pse-tool-module${className ? ` ${className}` : ''}`}
    >
      {profile.crest && continuous && (
        <>
          <rect className="pse-equip-crest" x={profile.crest.x} y="6" width={profile.crest.w} height="6" rx="3" fill={CYAN} />
          <path d={`M${profile.crest.x - 5} 15h${profile.crest.w + 10}`} stroke={S} strokeWidth="1" strokeLinecap="round" opacity="0.3" />
        </>
      )}

      {plate && (
        <>
          <path d={topFace} fill={TOP} />
          <path d={side} fill={SIDE} />
        </>
      )}

      {/* Front face of the instrument. */}
      <rect x={f.x} y={f.y} width={f.w} height={f.h} rx="4" fill={plate ? FACE : 'none'} stroke={S} strokeWidth="1.1" opacity={plate ? 0.82 : 0.5} />

      {profile.cells.map((cell, i) => (
        <rect
          key={i}
          className={cell.key ? 'pse-equip-cell pse-equip-cell--key' : 'pse-equip-cell'}
          x={cell.x}
          y={cell.y}
          width={cell.w}
          height={cell.h}
          rx="2"
          fill={cell.fill}
          opacity={cell.opacity ?? 1}
        />
      ))}

      <PseEquipChassis tier={t} showDimension={plate} />
    </svg>
  );
};

/* ═══════════════════ THE OPERATING SIGNATURE ═══════════════════ */

/**
 * The operating-signature chart.
 *
 * The one real difference between a session unit and a continuous unit is the
 * SHAPE of what it accrues: a session unit accrues in sessions and holds flat
 * between them, a continuous unit accrues without a break. That is a chart, and
 * drawing it does what a sentence cannot — it shows why the tiers are not
 * interchangeable. The curve is derived from the product's operating models and
 * is labelled as illustrative everywhere it appears; it is not a forecast, it
 * carries no figure, and it plots no account.
 */
export const PseOperatingSignature: React.FC<{ className?: string }> = ({ className }) => {
  const W = 320;
  const H = 96;
  const BASE = 78;
  const TOP = 16;

  /* Continuous duty: one straight accrual line for the whole window. */
  const continuous = `M0 ${BASE} L${W} ${TOP}`;
  const continuousArea = `M0 ${BASE} L${W} ${TOP} L${W} ${BASE} Z`;

  /*
   * Session duty: six working sessions across the window, each one followed by a
   * held plateau. Same slope while it works, nothing while it waits — which is
   * the entire reason a session unit is not a continuous unit.
   */
  const RISE = 32;
  const FLAT = 21;
  const STEP = 9;
  const sessionPath =
    `M0 ${BASE}` +
    Array.from({ length: 6 }, (_, i) => {
      const xr = RISE + i * (RISE + FLAT);
      const yr = BASE - STEP * (i + 1);
      return ` L${xr} ${yr} L${xr + FLAT} ${yr}`;
    }).join('');

  /* Grid: four vertical divisions (0/30/60/90 days), three horizontal bands. */
  const gridX = [1, 107, 213, 319];
  const gridY = [BASE, 57, 36, TOP];

  return (
    <svg
      className={`pse-signature${className ? ` ${className}` : ''}`}
      viewBox={`0 0 ${W} ${H}`}
      preserveAspectRatio="none"
      fill="none"
      aria-hidden="true"
      focusable="false"
      shapeRendering="geometricPrecision"
    >
      <defs>
        <linearGradient id="pse-sig-area" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="var(--pse-accent)" stopOpacity="0.26" />
          <stop offset="100%" stopColor="var(--pse-accent)" stopOpacity="0" />
        </linearGradient>
      </defs>

      {gridY.map(v => (
        <path key={`h${v}`} d={`M0 ${v}h${W}`} stroke="currentColor" strokeWidth="1" opacity={v === BASE ? 0.34 : 0.14} vectorEffect="non-scaling-stroke" />
      ))}
      {gridX.map(v => (
        <path key={`v${v}`} d={`M${v} 8v${BASE - 8}`} stroke="currentColor" strokeWidth="1" opacity="0.12" vectorEffect="non-scaling-stroke" />
      ))}

      <path className="pse-signature-area" d={continuousArea} fill="url(#pse-sig-area)" />
      <path
        className="pse-signature-line"
        d={continuous}
        stroke="var(--pse-accent)"
        strokeWidth="1.6"
        strokeLinecap="round"
        vectorEffect="non-scaling-stroke"
      />
      <path
        className="pse-signature-session"
        d={sessionPath}
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
        strokeLinejoin="round"
        opacity="0.62"
        strokeDasharray="3 3"
        vectorEffect="non-scaling-stroke"
      />
      {/* The endpoint marks: continuous finishes the window, session does not. */}
      <circle className="pse-signature-dot" cx={W - 1.5} cy={TOP} r="2.6" fill="var(--pse-accent)" />
      <circle cx={319} cy={BASE - STEP * 6} r="2.4" fill="currentColor" opacity="0.62" />
    </svg>
  );
};

/* ═══════════════════ THE SCALE LADDER ═══════════════════ */

/**
 * A tick ladder: the axis every capacity figure in the product is read against.
 * Drawn rather than typed, because a printed scale is what makes a bar a
 * measurement instead of a decoration.
 */
export const PseScale: React.FC<{
  /** The labels, evenly spaced from 0 to the ceiling. */
  labels: ReadonlyArray<string>;
  className?: string;
}> = ({ labels, className }) => (
  <div className={`pse-scale${className ? ` ${className}` : ''}`} aria-hidden="true">
    {labels.map((label, i) => (
      <span key={label} className="pse-scale-cell" data-edge={i === 0 ? 'start' : i === labels.length - 1 ? 'end' : undefined}>
        <span className="pse-scale-tick" />
        <span className="pse-scale-label">{label}</span>
      </span>
    ))}
  </div>
);

export default PseTierModule;
