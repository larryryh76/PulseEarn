import React, { useId } from 'react';
import { LOCKED_PSEMINE_TOOLS, type PSEToolTierId } from '../../types/psemine';

/**
 * MinerVisual — the PSEmine hardware illustration system.
 * ─────────────────────────────────────────────────────────────────────────────
 * Four tiers, ONE visual language, drawn as one parametric device in an oblique
 * (axonometric) projection: front face toward the viewer, top face and right
 * face receding up-and-right by a fixed depth direction.
 *
 * What the illustration communicates — and nothing else:
 *   • capacity tier, through the number of stacked modules and the filled
 *     capacity cells on the base module (1 of 4 … 4 of 4);
 *   • product progression, through chassis size, cooling density, heat-sink
 *     fins, rack framing and base plinth;
 *   • operational state, through ONE restrained status light.
 *
 * What it deliberately never shows (OWNER-BRIEF §9): no hash rate, no wattage,
 * no manufacturer, no benchmark, no invented technical figure. The only strings
 * rendered are the real tier names from LOCKED_PSEMINE_TOOLS.
 *
 * The geometry is deterministic — every shape is derived from the tier
 * parameters below, so the four illustrations cannot drift apart stylistically,
 * and the same component scales from a dense 64px list row to a marketplace
 * hero without changing its form language.
 */

/* ── Projection ─────────────────────────────────────────────────────────────
   One depth direction for all four tiers: 0.60 units right, 0.40 units up per
   unit of depth. Fixed, so every illustration shares the same viewpoint.
   ──────────────────────────────────────────────────────────────────────────── */
const ISO_X = 0.6;
const ISO_Y = -0.42;

const VB_W = 268;
const VB_H = 210;
/** Screen y of the base of the device — every tier stands on the same floor. */
const GROUND = 186;

interface TierGeometry {
  /** Chassis width / depth / module height, in illustration units. */
  w: number;
  d: number;
  moduleH: number;
  /** Stacked modules — the primary "capacity tier" signal. */
  modules: number;
  /** Recessed cooling vent slats per module. */
  ventRows: number;
  /** Cooling blocks across the front face. */
  ventBlocks: number;
  /** Heat-sink fins across the top face (0 = smooth top). */
  fins: number;
  /** Rack-frame overhang around the stack (0 = none). */
  frame: number;
  /** Base plinth height. */
  plinth: number;
  /** Filled capacity cells out of 4. */
  capacity: number;
  accent: string;
  accentSoft: string;
}

const GEOMETRY: Record<PSEToolTierId, TierGeometry> = {
  starter: {
    w: 104, d: 32, moduleH: 56, modules: 1,
    ventRows: 5, ventBlocks: 1, fins: 0, frame: 0, plinth: 6,
    capacity: 1, accent: '#9AA6B6', accentSoft: 'rgba(154,166,182,0.18)',
  },
  builder: {
    w: 126, d: 42, moduleH: 42, modules: 2,
    ventRows: 5, ventBlocks: 1, fins: 0, frame: 0, plinth: 7,
    capacity: 2, accent: '#4C9EF8', accentSoft: 'rgba(76,158,248,0.18)',
  },
  advanced: {
    w: 144, d: 50, moduleH: 34, modules: 3,
    ventRows: 4, ventBlocks: 2, fins: 18, frame: 0, plinth: 8,
    capacity: 3, accent: '#8B7CF6', accentSoft: 'rgba(139,124,246,0.18)',
  },
  elite: {
    w: 160, d: 60, moduleH: 33, modules: 4,
    ventRows: 5, ventBlocks: 2, fins: 22, frame: 7, plinth: 10,
    capacity: 4, accent: '#22D3EE', accentSoft: 'rgba(34,211,238,0.18)',
  },
};

export type MinerVisualSize = 'xs' | 'sm' | 'md' | 'lg';

/** Size → how much mechanical detail is drawn. */
const DETAIL: Record<MinerVisualSize, { full: boolean; ventScale: number }> = {
  xs: { full: false, ventScale: 0.6 },
  sm: { full: false, ventScale: 0.8 },
  md: { full: true, ventScale: 1 },
  lg: { full: true, ventScale: 1 },
};

const px = (n: number) => Math.round(n * 100) / 100;

export interface MinerVisualProps {
  tier: PSEToolTierId;
  size?: MinerVisualSize;
  className?: string;
  /**
   * 'frame'  — every tier shares one frame, so relative scale is comparable
   *            (marketplace, comparison, hero).
   * 'device' — the frame crops to the device, so it stays legible in a dense
   *            list row or a compact card. Defaults to 'device' for xs/sm.
   */
  fit?: 'frame' | 'device';
  /** Override the accessible description (defaults to the real tool name). */
  label?: string;
}

export const MinerVisual: React.FC<MinerVisualProps> = ({
  tier, size = 'md', className, label, fit,
}) => {
  const uid = useId().replace(/[:]/g, '');
  const g = GEOMETRY[tier];
  const detail = DETAIL[size];

  const gap = g.modules > 1 ? 3 : 0;
  const stackH = g.modules * g.moduleH + (g.modules - 1) * gap;
  const overhang = g.frame;
  const totalW = g.w + overhang * 2 + g.d * ISO_X;
  const ox = px((VB_W - totalW) / 2 + overhang);
  const oy = px(GROUND - g.plinth - stackH);

  const tight = (fit ?? (size === 'xs' || size === 'sm' ? 'device' : 'frame')) === 'device';
  const cropTop = px(oy - overhang - (g.d + 4) * -ISO_Y - 5);
  const viewBox = tight
    ? `${px(ox - overhang - 5)} ${cropTop} ${px(g.w + overhang * 2 + g.d * ISO_X + 10)} ${px(GROUND + g.plinth + 11 - cropTop)}`
    : `0 0 ${VB_W} ${VB_H}`;

  /** Project a point of device space onto the viewBox. */
  const P = (x: number, y: number, z: number): string =>
    `${px(ox + x + z * ISO_X)},${px(oy + y + z * ISO_Y)}`;

  const poly = (pts: Array<[number, number, number]>) =>
    pts.map(([x, y, z]) => P(x, y, z)).join(' ');

  const moduleTop = (i: number) => i * (g.moduleH + gap);
  const moduleBottom = (i: number) => moduleTop(i) + g.moduleH;

  const ids = {
    front: `mv-front-${uid}`,
    side: `mv-side-${uid}`,
    top: `mv-top-${uid}`,
    plinth: `mv-plinth-${uid}`,
    ground: `mv-ground-${uid}`,
  };

  const name = LOCKED_PSEMINE_TOOLS[tier]?.name ?? 'Mining tool';
  const ariaLabel = label ?? `${name} — conceptual illustration`;

  /* Vent geometry: vent blocks live in the left/middle of the front face; a
     22-unit column on the right is reserved for status + capacity cells, so no
     illustration ever has detail running into its indicator column. */
  const PAD = 9;
  const INDICATOR_W = 18;
  const usable = Math.max(20, g.w - PAD * 2 - INDICATOR_W);
  const blockGap = g.ventBlocks > 1 ? 7 : 0;
  const blockW = (usable - blockGap * (g.ventBlocks - 1)) / g.ventBlocks;

  return (
    <svg
      viewBox={viewBox}
      className={className}
      role="img"
      aria-label={ariaLabel}
      preserveAspectRatio="xMidYMax meet"
    >
      <defs>
        <linearGradient id={ids.front} x1="0" y1="0" x2="0.35" y2="1">
          <stop offset="0%" stopColor="#1E2733" />
          <stop offset="55%" stopColor="#18202B" />
          <stop offset="100%" stopColor="#121924" />
        </linearGradient>
        <linearGradient id={ids.side} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#151D27" />
          <stop offset="100%" stopColor="#0D131B" />
        </linearGradient>
        <linearGradient id={ids.top} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#2A3543" />
          <stop offset="100%" stopColor="#212B38" />
        </linearGradient>
        <linearGradient id={ids.plinth} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#161E28" />
          <stop offset="100%" stopColor="#0C1119" />
        </linearGradient>
        <radialGradient id={ids.ground} cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#000000" stopOpacity="0.55" />
          <stop offset="70%" stopColor="#000000" stopOpacity="0.18" />
          <stop offset="100%" stopColor="#000000" stopOpacity="0" />
        </radialGradient>
      </defs>

      {/* Contact shadow — the device reads as a physical object on a surface. */}
      <ellipse
        cx={px(ox + g.w / 2 + (g.d * ISO_X) / 2)}
        cy={GROUND + 5}
        rx={px(totalW * 0.44)}
        ry={px(6 + g.plinth * 0.3)}
        fill={`url(#${ids.ground})`}
      />

      {/* Rack frame (Elite): a structural chassis the modules sit inside. */}
      {overhang > 0 && (
        <g>
          <polygon points={poly([[-overhang, -overhang, 0], [g.w + overhang, -overhang, 0], [g.w + overhang, -overhang, g.d + 4], [-overhang, -overhang, g.d + 4]])} fill="#1B242F" />
          <polygon points={poly([[g.w + overhang, -overhang, 0], [g.w + overhang, stackH + overhang, 0], [g.w + overhang, stackH + overhang, g.d + 4], [g.w + overhang, -overhang, g.d + 4]])} fill="#0D131B" />
          <rect x={px(ox - overhang)} y={px(oy - overhang)} width={g.w + overhang * 2} height={stackH + overhang * 2} rx={3} fill="#0E141C" stroke="rgba(255,255,255,0.06)" strokeWidth="0.8" />
        </g>
      )}

      {/* Internal seam: what the module gaps reveal. */}
      <polygon points={poly([[0, 0, 0], [g.w, 0, 0], [g.w, 0, g.d], [0, 0, g.d]])} fill="#080C12" />
      <polygon points={poly([[g.w, 0, 0], [g.w, stackH, 0], [g.w, stackH, g.d], [g.w, 0, g.d]])} fill="#060A0F" />
      <rect x={ox} y={oy} width={g.w} height={stackH} fill="#080C12" />

      {/* Modules, top to bottom. */}
      {Array.from({ length: g.modules }).map((_, i) => {
        const y0 = moduleTop(i);
        const y1 = moduleBottom(i);
        const isBase = i === g.modules - 1;
        const isTop = i === 0;
        const rows = Math.max(2, Math.round(g.ventRows * detail.ventScale));
        /* The topmost module of a multi-module stack carries a control head:
           a recessed instrument strip with a readout, so the higher tiers read
           as monitored equipment rather than a plain stack of slabs. The vent
           field starts below it. */
        const head = isTop && g.modules >= 3;
        const ventTop = head ? 20 : 7;
        const rowH = (g.moduleH - (head ? 26 : 13)) / rows;

        return (
          <g key={i}>
            {/* right (side) face — recedes up-right */}
            <polygon
              points={poly([[g.w, y0, 0], [g.w, y1, 0], [g.w, y1, g.d], [g.w, y0, g.d]])}
              fill={`url(#${ids.side})`}
            />
            {/* top face — visible on every module; heat-sink fins only on the topmost */}
            <polygon
              points={poly([[0, y0, 0], [g.w, y0, 0], [g.w, y0, g.d], [0, y0, g.d]])}
              fill={`url(#${ids.top})`}
            />
            {isTop && g.fins > 0 && (
              <g>
                {Array.from({ length: g.fins }).map((__, f) => {
                  const fx = 4 + (f * (g.w - 8)) / g.fins;
                  const fw = Math.max(1.2, ((g.w - 8) / g.fins) * 0.34);
                  return (
                    <polygon
                      key={f}
                      points={poly([[fx, y0, 3], [fx + fw, y0, 3], [fx + fw, y0, g.d - 3], [fx, y0, g.d - 3]])}
                      fill="#303C4C"
                      opacity={0.85}
                    />
                  );
                })}
              </g>
            )}
            {/* front face */}
            <rect
              x={ox}
              y={px(oy + y0)}
              width={g.w}
              height={g.moduleH}
              rx={2}
              fill={`url(#${ids.front})`}
              stroke="rgba(255,255,255,0.07)"
              strokeWidth="0.7"
            />
            {/* machined top edge highlight */}
            <rect x={px(ox + 1)} y={px(oy + y0 + 0.6)} width={g.w - 2} height={0.9} fill="rgba(255,255,255,0.09)" />
            {/* machined right edge — the form has volume, not just a rectangle */}
            <rect x={px(ox + g.w - 1)} y={px(oy + y0 + 1)} width={0.9} height={g.moduleH - 2} fill="rgba(255,255,255,0.09)" />
            {/* tier accent spine — one accent per device, tier identity only */}
            <rect x={ox} y={px(oy + y0)} width={2} height={g.moduleH} fill={g.accent} opacity={0.85} />

            {/* control head: instrument strip, ticks only — no invented readouts */}
            {head && (
              <g>
                <rect
                  x={px(ox + PAD - 1)}
                  y={px(oy + y0 + 5)}
                  width={px(g.w - PAD * 2 + 2)}
                  height={11}
                  rx={1.5}
                  fill="#090E15"
                  stroke="rgba(255,255,255,0.07)"
                  strokeWidth="0.7"
                />
                <rect x={px(ox + PAD + 3)} y={px(oy + y0 + 8.6)} width={12} height={3.8} rx={1} fill="rgba(255,255,255,0.11)" />
                {[0, 1, 2, 3].map(k => (
                  <rect
                    key={k}
                    x={px(ox + g.w - PAD - 34 + k * 7.4)}
                    y={px(oy + y0 + 8.6)}
                    width={5}
                    height={3.8}
                    rx={0.9}
                    fill={g.accent}
                    opacity={0.8}
                  />
                ))}
              </g>
            )}

            {/* recessed cooling vents */}
            {Array.from({ length: g.ventBlocks }).map((__, b) => {
              const bx = PAD + b * (blockW + blockGap);
              return (
                <g key={b}>
                  <rect
                    x={px(ox + bx - 1.5)}
                    y={px(oy + y0 + ventTop - 2)}
                    width={px(blockW + 3)}
                    height={px(g.moduleH - ventTop - 3)}
                    rx={1.5}
                    fill="rgba(0,0,0,0.3)"
                  />
                  {Array.from({ length: rows }).map((___, r) => (
                    <g key={r}>
                      <rect
                        x={px(ox + bx)}
                        y={px(oy + y0 + ventTop + r * rowH)}
                        width={px(blockW)}
                        height={px(Math.max(1.3, rowH * 0.44))}
                        rx={0.8}
                        fill="#070B10"
                      />
                      <rect
                        x={px(ox + bx)}
                        y={px(oy + y0 + ventTop - 0.8 + r * rowH)}
                        width={px(blockW)}
                        height={0.7}
                        fill="rgba(255,255,255,0.06)"
                      />
                    </g>
                  ))}
                </g>
              );
            })}

            {/* status light + capacity cells in the reserved indicator column */}
            <g>
              {isBase ? (
                Array.from({ length: 4 }).map((__, c) => {
                  const filled = c < g.capacity;
                  return (
                    <rect
                      key={c}
                      x={px(ox + g.w - PAD - 19)}
                      y={px(oy + y1 - 9 - c * 7)}
                      width={19}
                      height={5}
                      rx={1.2}
                      fill={filled ? g.accent : 'rgba(255,255,255,0.09)'}
                      opacity={filled ? 0.95 : 1}
                    />
                  );
                })
              ) : (
                <>
                  <circle
                    cx={px(ox + g.w - PAD - 12)}
                    cy={px(oy + y0 + g.moduleH / 2)}
                    r={isTop ? 5.5 : 3.4}
                    fill={g.accentSoft}
                  />
                  <circle
                    cx={px(ox + g.w - PAD - 12)}
                    cy={px(oy + y0 + g.moduleH / 2)}
                    r={isTop ? 2.1 : 1.7}
                    fill={isTop ? g.accent : 'rgba(255,255,255,0.22)'}
                  />
                </>
              )}
            </g>

            {/* mechanical detail: fasteners + service port (md/lg only) */}
            {detail.full && (
              <g>
                <circle cx={px(ox + 5.5)} cy={px(oy + y0 + 4.5)} r={1.25} fill="rgba(255,255,255,0.14)" />
                <circle cx={px(ox + g.w - 5.5)} cy={px(oy + y1 - 4.5)} r={1.25} fill="rgba(255,255,255,0.14)" />
              </g>
            )}
            {detail.full && isBase && (
              <rect
                x={px(ox + PAD - 1)}
                y={px(oy + y1 - 8)}
                width={20}
                height={4.4}
                rx={1.2}
                fill="none"
                stroke="rgba(255,255,255,0.13)"
                strokeWidth="0.8"
              />
            )}
          </g>
        );
      })}

      {/* Base plinth + feet */}
      <g>
        <polygon
          points={poly([[-3, stackH, 0], [g.w + 3, stackH, 0], [g.w + 3, stackH, g.d + 3], [-3, stackH, g.d + 3]])}
          fill="#161E27"
        />
        <polygon
          points={poly([[g.w + 3, stackH, 0], [g.w + 3, stackH + g.plinth, 0], [g.w + 3, stackH + g.plinth, g.d + 3], [g.w + 3, stackH, g.d + 3]])}
          fill="#080C12"
        />
        <rect
          x={px(ox - 3)}
          y={px(oy + stackH)}
          width={g.w + 6}
          height={g.plinth}
          rx={1.5}
          fill={`url(#${ids.plinth})`}
          stroke="rgba(255,255,255,0.06)"
          strokeWidth="0.7"
        />
        <rect x={px(ox - 2)} y={px(oy + stackH + 0.7)} width={g.w + 4} height={0.8} fill={g.accent} opacity={0.5} />
        {tier === 'elite' && (
          <g>
            <rect x={px(ox - 1)} y={px(oy + stackH + g.plinth)} width={9} height={3.4} rx={1} fill="#0A0E14" />
            <rect x={px(ox + g.w - 8)} y={px(oy + stackH + g.plinth)} width={9} height={3.4} rx={1} fill="#0A0E14" />
            {/* rack handles — flagship only */}
            <rect x={px(ox + g.w / 2 - 10)} y={px(oy + stackH + 3)} width={3} height={4.4} rx={1} fill="#080C12" />
            <rect x={px(ox + g.w / 2 + 7)} y={px(oy + stackH + 3)} width={3} height={4.4} rx={1} fill="#080C12" />
          </g>
        )}
      </g>
    </svg>
  );
};

export default MinerVisual;
