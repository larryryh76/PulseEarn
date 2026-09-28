/**
 * PSEmine product art — the drawn vocabulary of the product.
 *
 * Three families, all specific to PSEmine, and all drawn rather than the result
 * of a stock icon set or a photograph:
 *
 * 1. GLYPHS (`PseGlyph`)
 *    One idea per glyph, 24×24, one stroke weight. They label the stages of a
 *    pipeline and the claims in the trust grid. Each draws exactly what it
 *    names, because a sequence reads faster when the marks are literal: a quote,
 *    a wallet, a verification, an activation; accrual, settlement, review, a
 *    payout; a server, a chain, an audit trail, a shield.
 *
 * 2. THE EQUIPMENT FAMILY (`PseTierModule`)
 *    One chassis, four interiors. Every tier is the same drawn machine — body,
 *    base rail, side vent — and the tier is carried by the *interior topology*:
 *    how many cells are populated and how they are arranged. Starter is one
 *    cell, Builder two stacked, Advanced a 2×2 block, Elite four across the rail
 *    with a continuous-duty crest above it. So the four tools read as one
 *    product line of increasing sophistication rather than four unrelated
 *    objects, and the difference is legible at 88px without any colour help.
 *
 * 3. THE TIER RATE CELL (`PseTierCell`)
 *    The compact roster form used inside the hero specimen.
 *
 * HONESTY. Nothing here is a readout. No glyph carries a number, a live state or
 * progress, because none of them knows anything about a particular visitor. The
 * accent colour is used to mark the single element each glyph or module is
 * actually about — never as decoration.
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

/** Body, base rail, vent. Shared by every tier — this is the family grammar. */
const CHASSIS = (
  <>
    <rect x="5" y="11" width="78" height="34" rx="6" stroke="currentColor" strokeWidth="1.2" opacity="0.5" />
    <path d="M9 45h70" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" opacity="0.22" />
    <path d="M76 18.5h3.4M76 24h3.4M76 29.5h3.4M76 35h3.4" stroke="currentColor" strokeWidth="1" strokeLinecap="round" opacity="0.28" />
  </>
);

/**
 * Interior cells per tier. Fewer, larger cells at the bottom of the family and
 * a populated rail at the top: the arrangement itself is the tier identity.
 */
const INTERIOR: Record<number, ReadonlyArray<{ x: number; y: number; w: number; h: number; fill?: string; opacity?: number }>> = {
  1: [{ x: 26, y: 21, w: 42, h: 14, fill: 'var(--pse-accent)' }],
  2: [
    { x: 24, y: 16, w: 46, h: 9, fill: 'var(--pse-accent)', opacity: 0.55 },
    { x: 24, y: 30, w: 46, h: 9, fill: 'var(--pse-accent)' },
  ],
  3: [
    { x: 17, y: 16, w: 24, h: 9, fill: 'var(--pse-accent)' },
    { x: 47, y: 16, w: 22, h: 9, fill: 'var(--pse-violet)', opacity: 0.85 },
    { x: 17, y: 30, w: 24, h: 9, fill: 'var(--pse-accent)', opacity: 0.75 },
    { x: 47, y: 30, w: 22, h: 9, fill: 'var(--pse-violet)', opacity: 0.5 },
  ],
  4: [
    { x: 12, y: 20, w: 14, h: 16, fill: 'var(--pse-accent)' },
    { x: 30, y: 20, w: 14, h: 16, fill: 'var(--pse-accent)', opacity: 0.8 },
    { x: 48, y: 20, w: 14, h: 16, fill: 'var(--pse-cyan)', opacity: 0.75 },
    { x: 66, y: 20, w: 9, h: 16, fill: 'var(--pse-cyan)' },
  ],
};

/**
 * One drawn mining unit. The tier changes the interior and, at the top of the
 * family, adds the continuous-duty crest — the one visual claim Elite makes
 * about itself, and one the product actually honours.
 */
export const PseTierModule: React.FC<{
  tier: number;
  /** Continuous-operation tier (Elite). */
  continuous?: boolean;
  width?: number;
  className?: string;
}> = ({ tier, continuous = false, width = 88, className }) => {
  const cells = INTERIOR[Math.min(4, Math.max(1, tier))] ?? INTERIOR[1];
  return (
    <svg
      width={width}
      height={(width * 56) / 88}
      viewBox="0 0 88 56"
      fill="none"
      aria-hidden="true"
      focusable="false"
      shapeRendering="geometricPrecision"
      className={`pse-tool-module ${className || ''}`}
    >
      {continuous && (
        <>
          <rect x="30" y="3" width="28" height="3" rx="1.5" fill="var(--pse-cyan)" />
          <path d="M22 7.5h44" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round" opacity="0.3" />
        </>
      )}
      {CHASSIS}
      {cells.map((c, i) => (
        <rect key={i} x={c.x} y={c.y} width={c.w} height={c.h} rx="2.5" fill={c.fill} opacity={c.opacity ?? 1} />
      ))}
    </svg>
  );
};

export default PseTierModule;
