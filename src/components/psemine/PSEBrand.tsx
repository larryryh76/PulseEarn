/**
 * PSEmine brand identity — the recovered mark.
 *
 * RECOVERED, NOT INVENTED. This is the faceted PSE emblem that was live across
 * the shell, the console, the public page and the authentication family
 * immediately before the first design purge (commit 38d7a5f,
 * `src/components/psemine/PSEBrand.tsx`, re-exported by `pse.tsx`). The geometry
 * below is that emblem's geometry, unchanged: five facets cut on one diagonal —
 * a blue blade, a light upper facet, a steel side facet, a dark inner notch and
 * a cyan crest. The identity is the facet arrangement, so it is preserved
 * exactly rather than redrawn.
 *
 * What changed is technical, not visual:
 *
 *   1. COLOUR IS A TOKEN, NOT A HEX. The original hard-coded a dark-mode
 *      palette (bone #EDEEEC, cut #0F0F12), which disappeared on a light
 *      surface. Each facet now reads a `--pse-brand-*` token that src/styles/
 *      psemine.css resolves per theme, so the same drawing works on paper and on
 *      ink without a second mark.
 *   2. ONE ACCESSIBLE TREATMENT. `decorative` now emits `aria-hidden` instead of
 *      an empty `role="img"` label; `tone="mono"` renders the whole emblem in
 *      one colour with the facets separated by opacity, so it survives print,
 *      engraving and disabled states.
 *   3. IT COMPOSES. The mark is one SVG on a 48×48 grid, drawn flat, so hero,
 *      auth, navigation, mobile, the loader and the favicon all use the same
 *      drawing at different sizes — never a competing second mark. Geometry is
 *      rendered at geometric precision so the facet edges stay crisp at 18px,
 *      and every fill is a flat token: no gradient, no glow, no shadow, so the
 *      emblem survives being printed, engraved or shown at 16px.
 *
 * THE CREST IS THE ONLY ANIMATED FACET, AND IT IS NOT ANIMATED TODAY. `live`
 * pulses the capacity facet to mark a running campaign. No public surface may
 * state a running campaign (a live position is account state and does not belong
 * on the landing, in authentication or in a loader), so nothing sets it: the
 * capability stays on the mark for the console, and the default is off.
 *
 * The wordmark is set in the product's own type roles (see DESIGN_SYSTEM.md):
 * the name in the interface family, the descriptor in the figure family, because
 * it describes terms rather than decoration.
 */
import React from 'react';

/**
 * The emblem's facets on a 48×48 grid, in draw order. Exported so the favicon
 * asset and the in-app mark can be generated from one definition instead of two
 * that drift apart.
 */
export const PSE_MARK_FACETS: ReadonlyArray<{ d: string; token: string; opacity?: number }> = [
  /* Blade — the primary facet, and the one that carries the mark's direction. */
  { d: 'M8 8L20 4V34L8 42V8Z', token: '--pse-brand-blade' },
  /* Upper facet — the light plane that gives the emblem its machined read. */
  { d: 'M22 4L38 12L42 16L22 24V4Z', token: '--pse-brand-top' },
  /* Side facet — the receding plane, always the quietest of the three solids. */
  { d: 'M22 24L42 16L36 30L22 34V24Z', token: '--pse-brand-side' },
  /* Inner notch — cut back to the surface colour, so it reads as a void. */
  { d: 'M22 10L32 15L22 20V10Z', token: '--pse-brand-cut' },
  /* Crest — the capacity facet. The only facet that ever carries state. */
  { d: 'M22 37L32 32L36 35L22 44V37Z', token: '--pse-brand-crest' },
];

export type PseMarkTone = 'brand' | 'mono';

/**
 * The emblem on its own: favicons, dense chrome, avatars and anywhere the
 * wordmark would wrap.
 *
 * `live` pulses the crest facet — the one facet that represents capacity — so
 * the mark can indicate a running campaign. It is state indication, not
 * decoration, and it is disabled under `prefers-reduced-motion`.
 */
export const PSEmineMark: React.FC<{
  size?: number;
  tone?: PseMarkTone;
  /** Marks a running campaign by pulsing the capacity facet. */
  live?: boolean;
  /** Accessible name. Ignored when `decorative`. */
  title?: string;
  /** The surrounding control already names the product. */
  decorative?: boolean;
  className?: string;
}> = ({ size = 32, tone = 'brand', live = false, title = 'PSEmine', decorative = false, className }) => {
  const labelled = !decorative && Boolean(title);
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      fill="none"
      className={`pse-mark-glyph ${className || ''}`}
      shapeRendering="geometricPrecision"
      role={labelled ? 'img' : undefined}
      aria-label={labelled ? title : undefined}
      aria-hidden={labelled ? undefined : true}
      focusable="false"
    >
      {PSE_MARK_FACETS.map((facet, i) => {
        const isCrest = i === PSE_MARK_FACETS.length - 1;
        return (
          <path
            key={facet.d}
            d={facet.d}
            fill={tone === 'mono' ? 'currentColor' : `var(${facet.token})`}
            opacity={tone === 'mono' ? (isCrest ? 0.55 : i === 2 ? 0.38 : i === 3 ? 1 : 0.8) : facet.opacity}
            className={isCrest && live && tone === 'brand' ? 'pse-mark-crest-live' : undefined}
          />
        );
      })}
    </svg>
  );
};

/**
 * Mark plus wordmark. Renders as a `<span>`, so wrap it in a `Link` where it
 * needs to navigate and it still works inside buttons and headings.
 *
 * The descriptor is a product statement, never a figure or a claim — which is
 * why it does not repeat the campaign length here.
 */
export const PSEmineLogo: React.FC<{
  size?: number;
  tone?: PseMarkTone;
  withSub?: boolean;
  live?: boolean;
  decorative?: boolean;
  className?: string;
}> = ({ size = 30, tone = 'brand', withSub = false, live = false, decorative = false, className }) => (
  <span className={`pse-mark ${className || ''}`}>
    <PSEmineMark size={size} tone={tone} live={live} decorative={decorative} />
    <span className="pse-wordmark">
      <span className="pse-wordmark-name">PSEmine</span>
      {withSub && <span className="pse-wordmark-sub">Campaign mining</span>}
    </span>
  </span>
);

export default PSEmineLogo;
