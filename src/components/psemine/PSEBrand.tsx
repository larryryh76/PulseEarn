/**
 * PSEmine brand identity.
 *
 * One mark, one wordmark, one monochrome treatment — no competing identities.
 *
 * The mark is a refinement of the faceted PSE emblem that preceded the design
 * purge. The old emblem tried to spell three letters in five overlapping facets
 * and stopped resolving below ~28px. What was worth keeping is its best idea:
 * a machined plate seen in elevation, cut on a 45° shear. That idea is kept and
 * the letterforms are dropped.
 *
 *   The ore plate — a rounded plate with a chamfered top-right corner holding
 *   three ascending capacity bars, each cut on the same 45° shear as the
 *   corner. One angle, used four times.
 *
 * What it reads as, in order of importance: a measured quantity rising inside a
 * bounded vessel. Capacity, controlled growth, a gauge — the product's actual
 * model (tools → capacity → campaign earnings). It stays legible as a single
 * 16px glyph because it is three shapes and one outline, with a 1.8px plate
 * stroke at every size.
 *
 * What it deliberately is not: a pickaxe, a coin, a banknote, a lightning bolt,
 * an arrow, an AI sparkle, a shield, a claim about returns. No gradient, no glow
 * and no shadow — the mark is flat, so it survives being printed, favicon-scaled
 * and rendered in monochrome.
 *
 * Colours come from the PSEmine tokens in src/styles/psemine.css (never raw
 * hex here): the plate is `currentColor`, the capacity bars are `--pse-accent`.
 */
import React from 'react';

/** Geometry on a 32×32 grid. `animated` maps the bars to the loader's pulse. */
const PLATE_PATH =
  'M3 26.5V5.5A2.5 2.5 0 0 1 5.5 3h14L29 12.5v14a2.5 2.5 0 0 1-2.5 2.5h-21A2.5 2.5 0 0 1 3 26.5Z';

/**
 * The three capacity bars: rising heights, tops sheared at 45°. Shared with the
 * loader so the animated mark and the static mark can never drift apart.
 */
export const PSE_MARK_BARS: readonly string[] = [
  'M9.5 26.4V20.6l3-3v8.8Z',
  'M14.5 26.4V16l3-3v13.4Z',
  'M19.5 26.4V11l3-3v18.4Z',
];

export type PseMarkTone = 'brand' | 'mono';

/**
 * The glyph on its own. Use for favicons, avatars, dense chrome and anywhere the
 * wordmark would wrap. `tone="mono"` renders the whole mark in one colour for
 * single-colour contexts (print, engraving, disabled states).
 */
export const PSEmineMark: React.FC<{
  size?: number;
  tone?: PseMarkTone;
  /** Pulses the capacity bars in sequence. Indeterminate state indication only. */
  animated?: boolean;
  title?: string;
  className?: string;
}> = ({ size = 32, tone = 'brand', animated = false, title = 'PSEmine', className }) => {
  const barFill = tone === 'mono' ? 'currentColor' : 'var(--pse-accent, #0b6e7f)';
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      className={`pse-mark-glyph ${className || ''}`}
      role="img"
      aria-label={title}
    >
      <path d={PLATE_PATH} stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
      {PSE_MARK_BARS.map((d, i) => (
        <path
          key={d}
          d={d}
          fill={barFill}
          className={animated ? `pse-loader-cap ${i > 0 ? `pse-loader-cap-${i + 1}` : ''}` : undefined}
        />
      ))}
    </svg>
  );
};

/**
 * Mark + wordmark. Renders as a `<span>`; wrap it in a `Link` where it needs to
 * navigate, so the component stays usable inside buttons and headings too.
 *
 * The sub-line is a product descriptor, not a claim: PSEmine is a campaign
 * product, and its own campaign length comes from the locked economics, so the
 * descriptor never states a number here.
 */
export const PSEmineLogo: React.FC<{
  size?: number;
  tone?: PseMarkTone;
  withSub?: boolean;
  /** Hidden from AT when the surrounding control already names the product. */
  decorative?: boolean;
  className?: string;
}> = ({ size = 30, tone = 'brand', withSub = false, decorative = false, className }) => (
  <span className={`pse-mark ${className || ''}`}>
    <PSEmineMark size={size} tone={tone} title={decorative ? '' : 'PSEmine'} />
    <span className="pse-wordmark">
      <span className="pse-wordmark-name">PSEmine</span>
      {withSub && <span className="pse-wordmark-sub">Campaign mining</span>}
    </span>
  </span>
);

export default PSEmineLogo;
