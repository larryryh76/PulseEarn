/**
 * PSEmine product identity and the MINING MODULE visual system
 * Phase 2 — Premium Financial Campaign (blue / cyan / purple accents).
 *
 * Research principles: Stripe narrative clarity, Wise financial hierarchy,
 * Mercury restraint, Coinbase/Trust Wallet/Phantom security clarity,
 * Binance/Bybit aligned information, Linear/Vercel operational state,
 * Notion/Raycast demonstrations — transferred, never copied.
 *
 * Two things live here:
 *  1. The brand mark — faceted PSE emblem, flattened into the Phase 2 palette
 *     (electric blue + soft cyan + bone + steel). No glow, no gradients, no glass.
 *  2. The MODULE family — Starter / Builder / Advanced / Elite as a single
 *     product line: machined front elevation, line-first, graphite plate with
 *     tier-specific core bars. Tier is carried by TOPOLOGY (bay count, vent
 *     bank, service rail, crest), never by size alone. Duty identity is drawn,
 *     not written.
 *
 * Visual story: TOOLS → CAPACITY → TIME → CAMPAIGN EARNINGS → SETTLEMENT → BNB PAYOUT
 */
import React from 'react';

/* ── Brand mark — Phase 2 palette ────────────────────────────────────────
 * Electric blue is primary interaction, soft cyan is capacity/data,
 * bone is control/type, steel is structure. The mark is quiet, not glowing.
 */

const MARK_BLUE = '#2F6BFF';
const MARK_CYAN = '#22D3EE';
const MARK_BONE = '#EDEEEC';
const MARK_STEEL = 'rgba(255,255,255,0.42)';
const MARK_CUT = '#0F0F12';

export function PSELogo({ size = 32, withWordmark = false }: { size?: number; withWordmark?: boolean }) {
  return (
    <span className="inline-flex items-center gap-2.5 select-none">
      <svg width={size} height={size} viewBox="0 0 48 48" fill="none" aria-label="PSEmine emblem" className="shrink-0">
        {/* Left blade — electric blue, primary */}
        <path d="M8 8L20 4V34L8 42V8Z" fill={MARK_BLUE} />
        {/* Top facet — bone */}
        <path d="M22 4L38 12L42 16L22 24V4Z" fill={MARK_BONE} />
        {/* Side facet — steel */}
        <path d="M22 24L42 16L36 30L22 34V24Z" fill={MARK_STEEL} />
        {/* Cut */}
        <path d="M22 10L32 15L22 20V10Z" fill={MARK_CUT} />
        {/* Bottom crest — soft cyan, capacity identity */}
        <path d="M22 37L32 32L36 35L22 44V37Z" fill={MARK_CYAN} />
      </svg>
      {withWordmark && (
        <span className="pse-wordmark">
          <span className="pse-wordmark-name">PSEmine</span>
          <span className="pse-wordmark-sub">90-day campaign</span>
        </span>
      )}
    </span>
  );
}

/** Branded loader — emblem breathing, not a generic spinner. */
export function PSELoader({ label = 'Loading', size = 40 }: { label?: string; size?: number }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3.5" role="status" aria-live="polite" aria-label={label}>
      <svg width={size} height={size} viewBox="0 0 48 48" fill="none" aria-hidden="true">
        <path d="M8 8L20 4V34L8 42V8Z" fill={MARK_BLUE} opacity="0.9">
          <animate attributeName="opacity" values="0.9;0.4;0.9" dur="1.6s" repeatCount="indefinite" />
        </path>
        <path d="M22 4L38 12L42 16L22 24V4Z" fill={MARK_BONE} opacity="0.9">
          <animate attributeName="opacity" values="0.9;0.4;0.9" dur="1.6s" begin="0.22s" repeatCount="indefinite" />
        </path>
        <path d="M22 24L42 16L36 30L22 34V24Z" fill={MARK_STEEL}>
          <animate attributeName="opacity" values="0.9;0.4;0.9" dur="1.6s" begin="0.44s" repeatCount="indefinite" />
        </path>
      </svg>
      <span className="pse-np">{label}</span>
    </div>
  );
}

/* ── The module family ──────────────────────────────────────────────────────
 * One drawing language, four topologies. Geometry on 120×72 so every tier
 * shares a baseline and scale. Color is a key:
 *  Starter  (tier 1) — compact single-bay, soft cyan identity
 *  Builder  (tier 2) — two-bay stacked, electric-blue spine
 *  Advanced (tier 3) — three-bay array, restrained blue-purple depth
 *  Elite    (tier 4) — flagship multi-chamber, distinctive crest
 * No glow, no glass, no cyberpunk lighting.
 * ─────────────────────────────────────────────────────────────────────────── */

export type ModuleTier = 1 | 2 | 3 | 4;
export type ModuleState = 'available' | 'owned' | 'limit' | 'idle' | 'stopped';
export type DutyModel = 'session' | 'continuous';

/* Plate — slightly lifted graphite, quiet hairline */
const PLATE = '#1E2026';
const EDGE = 'rgba(255,255,255,0.12)';
const EDGE_STRONG = 'rgba(255,255,255,0.16)';
const STEEL = 'rgba(255,255,255,0.09)';
const CORE_OFF = 'rgba(255,255,255,0.12)';

/* Tier-specific core identities — Phase 2 strict */
const TIER_CORE: Record<ModuleTier, { on: string; hot: string; glow: string }> = {
  1: { on: '#22D3EE', hot: '#4DD4E5', glow: 'rgba(34,211,238,0.32)' }, // Starter — soft cyan
  2: { on: '#2F6BFF', hot: '#5A8BFF', glow: 'rgba(47,107,255,0.30)' },  // Builder — electric blue
  3: { on: '#7A5CFA', hot: '#9B85FF', glow: 'rgba(122,92,250,0.30)' },  // Advanced — restrained purple
  4: { on: '#2F6BFF', hot: '#22D3EE', glow: 'rgba(47,107,255,0.34)' },  // Elite — flagship (blue core, cyan crest)
};

const tierCore = (tier: ModuleTier, hot: boolean) => (hot ? TIER_CORE[tier].hot : TIER_CORE[tier].on);

const core = (x: number, y: number, w: number, h: number, tier: ModuleTier, on: boolean, hot = false) => (
  <rect key={`c${x}-${y}-${tier}`} x={x} y={y} width={w} height={h} rx="1.5" fill={on ? tierCore(tier, hot) : CORE_OFF} />
);

type MarkProps = { tier: ModuleTier; size?: number; active?: boolean; stopped?: boolean; className?: string };

/**
 * The machined object itself. `active` lights the core bars (tool is inside
 * an operating duty cycle); `stopped` marks a session that ended without a
 * restart — amber attention.
 */
export function ModuleMark({ tier, size = 160, active = false, stopped = false, className }: MarkProps) {
  const on = active && !stopped;
  const hot = on;
  const fill = stopped ? '#E0A03A' : undefined;
  const glow = TIER_CORE[tier].glow;
  return (
    <svg
      width={size}
      height={(size * 72) / 120}
      viewBox="0 0 120 72"
      fill="none"
      className={className}
      aria-hidden="true"
      role="img"
    >
      {/* Baseline — quiet, never glowing */}
      <rect x="18" y="66" width="84" height="2" rx="1" fill={on ? glow : STEEL} />

      {tier === 1 && (
        <>
          {/* Compact single-bay — smallest silhouette, one primary intake */}
          <rect x="46" y="24" width="28" height="24" rx="3" fill={PLATE} stroke={EDGE} />
          {core(51, 29, 18, 7, tier, on, hot)}
          {core(51, 39, 18, 3, tier, false)}
          <rect x="40" y="52" width="40" height="3" rx="1.5" fill={STEEL} />
          {/* Single intake mark — Cyan Tier detail */}
          <rect x="54" y="42" width="12" height="1.5" rx="0.75" fill={on ? 'rgba(34,211,238,0.22)' : 'rgba(255,255,255,0.06)'} />
        </>
      )}

      {tier === 2 && (
        <>
          {/* Two-bay stacked — central structural spine, visible service rail */}
          <rect x="40" y="14" width="40" height="17" rx="3" fill={PLATE} stroke={EDGE} />
          <rect x="40" y="35" width="40" height="17" rx="3" fill={PLATE} stroke={EDGE} />
          <rect x="44" y="31.5" width="32" height="3" rx="1.5" fill={on ? TIER_CORE[2].on : STEEL} opacity={on ? 0.9 : 1} />
          {core(45, 19, 14, 7, tier, on, hot)}
          {core(45, 40, 14, 7, tier, on, false)}
          <rect x="62" y="19" width="13" height="7" rx="1.5" fill={on ? 'rgba(47,107,255,0.14)' : STEEL} />
          <rect x="62" y="40" width="13" height="7" rx="1.5" fill="rgba(255,255,255,0.06)" />
          <rect x="36" y="56" width="48" height="3" rx="1.5" fill={STEEL} />
        </>
      )}

      {tier === 3 && (
        <>
          {/* Three-bay array — layered rails, complex vent pattern, purple depth */}
          <rect x="24" y="16" width="24" height="32" rx="3" fill={PLATE} stroke={EDGE_STRONG} />
          <rect x="48" y="16" width="24" height="32" rx="3" fill={PLATE} stroke={EDGE_STRONG} />
          <rect x="72" y="16" width="24" height="32" rx="3" fill={PLATE} stroke={EDGE_STRONG} />
          {core(29, 21, 14, 6, tier, on, hot)}
          {core(53, 21, 14, 6, tier, on, false)}
          {core(77, 21, 14, 6, tier, on, false)}
          {[31, 36, 41].map(y => (
            <rect key={y} x="29" y={y} width="60" height="2" rx="1" fill={on ? 'rgba(122,92,250,0.18)' : 'rgba(255,255,255,0.06)'} />
          ))}
          <rect x="24" y="52" width="72" height="3" rx="1.5" fill={STEEL} />
          <circle cx="92" cy="53.5" r="2" fill={stopped ? '#E0A03A' : on ? TIER_CORE[3].hot : CORE_OFF} />
        </>
      )}

      {tier === 4 && (
        <>
          {/* Flagship multi-chamber — distinctive crest/nameplate, not a giant card */}
          <rect x="38" y="5" width="44" height="4" rx="2" fill={stopped ? '#E0A03A' : on ? TIER_CORE[4].hot : 'rgba(255,255,255,0.18)'} />
          <rect x="26" y="14" width="68" height="38" rx="4" fill={PLATE} stroke={EDGE_STRONG} />
          <rect x="59.5" y="14" width="1" height="38" fill="rgba(255,255,255,0.08)" />
          {core(32, 21, 25, 12, tier, on, hot)}
          {core(63, 21, 25, 12, tier, on, false)}
          {/* Crest detail — flagship precision */}
          <rect x="32" y="38" width="56" height="2.5" rx="1.25" fill={on ? 'rgba(34,211,238,0.14)' : 'rgba(255,255,255,0.07)'} />
          <rect x="32" y="44" width="40" height="2.5" rx="1.25" fill="rgba(255,255,255,0.05)" />
          <rect x="30" y="56" width="60" height="3" rx="1.5" fill={STEEL} />
          {/* Flagship vent precision */}
          <rect x="34" y="47" width="16" height="1.5" rx="0.75" fill={on ? 'rgba(47,107,255,0.22)' : 'rgba(255,255,255,0.05)'} />
          <rect x="52" y="47" width="16" height="1.5" rx="0.75" fill={on ? 'rgba(122,92,250,0.18)' : 'rgba(255,255,255,0.05)'} />
        </>
      )}

      {stopped && <rect x="24" y="62" width="72" height="2" rx="1" fill={fill} />}
    </svg>
  );
}

/** Ownership ticks — tier's real limit, filled to owned. Cyan = capacity held. */
export function Ticks({ owned = 0, total }: { owned?: number; total: number }) {
  const n = Math.max(0, total);
  const on = Math.min(Math.max(0, owned), n);
  return (
    <span className="pse-ticks" role="img" aria-label={`${on} of ${n} owned`}>
      {Array.from({ length: n }, (_, i) => (
        <span key={i} className="pse-tick" data-on={i < on ? 'true' : 'false'} />
      ))}
    </span>
  );
}

/**
 * Duty rail (module scale) — the difference between tiers that actually exists.
 * session    → four discrete segments, lit while cycle is open (tier-coloured)
 * continuous → one unbroken rail (Elite never needs manual restart)
 */
export function DutySegments({
  duty,
  running,
  stopped,
  tier,
}: {
  duty: DutyModel;
  running: boolean;
  stopped?: boolean;
  tier?: ModuleTier;
}) {
  const segments = duty === 'continuous' ? 5 : 4;
  return (
    <span
      className="pse-dutyseg"
      data-continuous={duty === 'continuous' ? 'true' : 'false'}
      data-stopped={stopped ? 'true' : 'false'}
      data-tier={tier ? String(tier) : undefined}
      aria-hidden="true"
    >
      {Array.from({ length: segments }, (_, i) => (
        <span key={i} data-on={running && !stopped ? 'true' : 'false'} />
      ))}
    </span>
  );
}

const dutyLabel = (duty: DutyModel) => (duty === 'continuous' ? 'Continuous duty' : 'Session duty · 24h');

/**
 * ModulePlate — module family member as product: object, nameplate, capacity,
 * ownership and duty, in one unit. Used by marketplace, landing spec sheet,
 * day-0 decision aid. Every tool shows name/tier/price/hourly capacity/
 * ownership limit/operating model/ownership/status/action.
 */
export function ModulePlate({
  tier,
  name,
  rateGBPPerHour,
  priceGBP,
  maxPerUser,
  owned = 0,
  duty,
  state = 'available',
  artSize = 200,
  children,
}: {
  tier: ModuleTier;
  name: string;
  rateGBPPerHour: number;
  priceGBP?: number;
  maxPerUser: number;
  owned?: number;
  duty: DutyModel;
  state?: ModuleState;
  artSize?: number;
  children?: React.ReactNode;
}) {
  const running = state === 'owned';
  const stopped = state === 'stopped';
  return (
    <div className="pse-mod" data-state={state}>
      <div className="pse-mod-plate">
        <ModuleMark tier={tier} size={artSize} active={running || stopped} stopped={stopped} className="pse-mod-art" />
      </div>
      <div className="pse-mod-name">
        <div className="pse-mod-tier">
          <span className="pse-np">Tier {tier}</span>
          <span className="pse-np">{dutyLabel(duty)}</span>
        </div>
        <p className="pse-h3">{name}</p>
        <p className="pse-mod-rate pse-n">
          £{rateGBPPerHour.toFixed(2)}<span className="pse-meta"> / hour</span>
        </p>
        <div className="flex items-center justify-between gap-3">
          <Ticks owned={owned} total={maxPerUser} />
          <span className="pse-meta">of {maxPerUser}</span>
        </div>
        <DutySegments duty={duty} running={running} stopped={stopped} tier={tier} />
        {typeof priceGBP === 'number' && (
          <div className="pse-spec-line">
            <span>Price</span>
            <span>£{priceGBP.toFixed(2)}</span>
          </div>
        )}
        {children}
      </div>
    </div>
  );
}
