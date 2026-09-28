/**
 * PSEmine product art — the drawn vocabulary of the product.
 *
 * Two families, both specific to PSEmine, both drawn rather than borrowed from
 * an icon set or a photograph:
 *
 * 1. GLYPHS (`PseGlyph`)
 *    One idea per glyph, 24×24, one stroke weight. They label the stages of a
 *    pipeline and the claims on the trust map. Each draws exactly what it names,
 *    because a sequence reads faster when the marks are literal: a quote, a
 *    wallet, a verification, an activation; accrual, settlement, review, a
 *    payout; a server, a chain, an audit trail, a shield.
 *
 * 2. THE EQUIPMENT FAMILY (`PseTierModule`)
 *    Four engineered instruments on one 120×96 grid, drawn from a single
 *    grammar so they read as one product line rather than four cards:
 *
 *      PLINTH      a base plate with two feet — every unit stands on it
 *      CALIBRATION a ticked rail up the left edge — every unit is calibrated
 *      MAST        a capacity column on the right that GROWS WITH THE TIER
 *      FRAME       the instrument frame, taller as the tier rises
 *      CELLS       the working surface, more continuous as the tier rises
 *      CREST       Elite's continuous-duty bar — the only tier that carries one,
 *                  because Elite is the only tier that mines continuously
 *
 *    The progression is geometric and deliberate: Starter is a low, narrow
 *    chassis with a single cell; Builder stacks two; Advanced opens into a 2×2
 *    lattice and introduces the restrained violet; Elite is the tallest frame,
 *    a full four-column bank plus the continuous crest in cyan. Silhouette and
 *    cell topology carry the tier — not colour alone, and not four hues — so the
 *    difference is legible at 60px, in monochrome, and to a colour-blind reader.
 *
 * HONESTY. Nothing here is a readout. No glyph carries a number, a live state or
 * progress, because none of them knows anything about a particular visitor. A
 * cell's fill marks which part of the instrument is *active*, never how much of
 * anything a person holds.
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

/** One 120×96 grid. Plinth at y=78 so every unit stands on the same floor. */
const GRID_W = 120;
const GRID_H = 96;
const FLOOR = 78;

const ACCENT = 'var(--pse-accent)';
const CYAN = 'var(--pse-cyan)';
const VIOLET = 'var(--pse-violet)';

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
  /** Where the capacity mast starts, and what it is filled with. */
  mastTop: number;
  mastFill: string;
  mastOpacity: number;
  /** Elite only: the continuous-duty crest, drawn above the frame. */
  crest?: { x: number; w: number };
}

/**
 * The four profiles. Read them as one family: the frame grows, the mast grows,
 * the cells multiply, and the last one gains a crest.
 */
const EQUIPMENT: Record<number, PseEquipProfile> = {
  1: {
    frame: { x: 24, y: 52, w: 58, h: 26 },
    mastTop: 62,
    mastFill: ACCENT,
    mastOpacity: 0.34,
    cells: [{ x: 34, y: 60, w: 38, h: 10, fill: ACCENT, key: true }],
  },
  2: {
    frame: { x: 22, y: 38, w: 64, h: 40 },
    mastTop: 46,
    mastFill: ACCENT,
    mastOpacity: 0.55,
    cells: [
      { x: 32, y: 46, w: 44, h: 11, fill: ACCENT, opacity: 0.5 },
      { x: 32, y: 62, w: 44, h: 11, fill: ACCENT, key: true },
    ],
  },
  3: {
    frame: { x: 20, y: 30, w: 70, h: 48 },
    mastTop: 34,
    mastFill: VIOLET,
    mastOpacity: 0.7,
    cells: [
      { x: 28, y: 38, w: 26, h: 13, fill: ACCENT, key: true },
      { x: 56, y: 38, w: 26, h: 13, fill: VIOLET, opacity: 0.85 },
      { x: 28, y: 57, w: 26, h: 13, fill: ACCENT, opacity: 0.7 },
      { x: 56, y: 57, w: 26, h: 13, fill: VIOLET, opacity: 0.5 },
    ],
  },
  4: {
    frame: { x: 18, y: 22, w: 76, h: 56 },
    mastTop: 24,
    mastFill: CYAN,
    mastOpacity: 1,
    crest: { x: 30, w: 58 },
    cells: [
      { x: 26, y: 30, w: 56, h: 13, fill: ACCENT, key: true },
      { x: 26, y: 50, w: 12, h: 20, fill: ACCENT, opacity: 0.8 },
      { x: 41, y: 50, w: 12, h: 20, fill: ACCENT, opacity: 0.62 },
      { x: 56, y: 50, w: 12, h: 20, fill: CYAN, opacity: 0.8 },
      { x: 71, y: 50, w: 11, h: 20, fill: CYAN },
    ],
  },
};

/** The grammar every unit shares: plinth, feet, calibration rail, capacity mast. */
const PseEquipChassis: React.FC<{ mastTop: number; mastFill: string; mastOpacity: number }> = ({
  mastTop,
  mastFill,
  mastOpacity,
}) => (
  <>
    {/* Plinth and its two feet — one floor for the whole family. */}
    <rect x="14" y={FLOOR} width="92" height="9" rx="3" stroke={S} strokeWidth="1.2" opacity="0.42" />
    <path d={`M26 ${FLOOR + 9}v5M94 ${FLOOR + 9}v5`} stroke={S} strokeWidth="1.2" strokeLinecap="round" opacity="0.26" />

    {/* Calibration rail with four ticks — the family's left edge. */}
    <path d="M13 34v44" stroke={S} strokeWidth="1.1" strokeLinecap="round" opacity="0.22" />
    <path
      d="M13 40h5M13 52h5M13 64h5M13 76h3"
      stroke={S}
      strokeWidth="1.1"
      strokeLinecap="round"
      opacity="0.3"
    />

    {/* Capacity mast — the column that grows with the tier. */}
    <rect x="104" y={mastTop} width="8" height={FLOOR - mastTop} rx="2" stroke={S} strokeWidth="1.1" opacity="0.3" />
    <rect className="pse-equip-mast" x="104" y={mastTop} width="8" height={FLOOR - mastTop} rx="2" fill={mastFill} opacity={mastOpacity} />
  </>
);

/**
 * One drawn mining unit. The tier is carried by the frame, the mast and the cell
 * topology — so the four belong to one product line and the difference survives
 * at 60px, in monochrome, and without colour.
 */
export const PseTierModule: React.FC<{
  tier: number;
  /** Continuous-operation tier (Elite). Draws the crest. */
  continuous?: boolean;
  width?: number;
  className?: string;
}> = ({ tier, continuous = false, width = 120, className }) => {
  const profile = EQUIPMENT[Math.min(4, Math.max(1, tier))] ?? EQUIPMENT[1];

  return (
    <svg
      width={width}
      height={(width * GRID_H) / GRID_W}
      viewBox={`0 0 ${GRID_W} ${GRID_H}`}
      fill="none"
      aria-hidden="true"
      focusable="false"
      shapeRendering="geometricPrecision"
      className={`pse-tool-module ${className || ''}`}
    >
      {profile.crest && continuous && (
        <>
          <rect
            className="pse-equip-crest"
            x={profile.crest.x}
            y="13"
            width={profile.crest.w}
            height="6"
            rx="3"
            fill={CYAN}
          />
          <path
            d={`M${profile.crest.x - 4} 21h${profile.crest.w + 8}`}
            stroke={S}
            strokeWidth="1.1"
            strokeLinecap="round"
            opacity="0.28"
          />
        </>
      )}

      <rect
        x={profile.frame.x}
        y={profile.frame.y}
        width={profile.frame.w}
        height={profile.frame.h}
        rx="5"
        stroke={S}
        strokeWidth="1.2"
        opacity="0.46"
      />

      {profile.cells.map((cell, i) => (
        <rect
          key={i}
          className={cell.key ? 'pse-equip-cell pse-equip-cell--key' : 'pse-equip-cell'}
          x={cell.x}
          y={cell.y}
          width={cell.w}
          height={cell.h}
          rx="2.5"
          fill={cell.fill}
          opacity={cell.opacity ?? 1}
        />
      ))}

      <PseEquipChassis mastTop={profile.mastTop} mastFill={profile.mastFill} mastOpacity={profile.mastOpacity} />
    </svg>
  );
};

export default PseTierModule;
