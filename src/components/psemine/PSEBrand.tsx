/**
 * PSEmine product identity and the MINING MODULE visual system
 * (approved art direction: DUTY & LEDGER).
 *
 * Two things live here and nothing else:
 *
 *  1. The brand mark — the faceted PSE emblem, flattened into the approved
 *     palette (jade + bone + steel). No decorative gradients, no blue/cyan.
 *
 *  2. The MODULE family — Starter, Builder, Advanced, Elite drawn as a single
 *     product line: a machined front elevation, line-first, steel plate with
 *     jade core bars. Tier is carried by TOPOLOGY (bay count, vent bank,
 *     service rail, crest), never by size alone, and every module ships with a
 *     NAMEPLATE (tier / name / £ per hour). Duty identity is drawn, not
 *     written: session tools show a segmented duty rail, Elite shows an
 *     unbroken one. Ownership is drawn as its real complement of ticks
 *     (5 / 3 / 3 / 2).
 *
 * No hash rates, no hardware claims, no manufacturer names, no 3D, no coin
 * imagery — the geometry communicates scale, tier and duty and nothing more.
 */
import React from 'react';

/* ── Brand mark ──────────────────────────────────────────────────────────── */

const MARK_JADE = '#4FD1A5';
const MARK_JADE_DEEP = '#17A97A';
const MARK_BONE = '#EDEEEC';
const MARK_STEEL = 'rgba(255,255,255,0.42)';
const MARK_CUT = '#0B0B0C';

export function PSELogo({ size = 32, withWordmark = false }: { size?: number; withWordmark?: boolean }) {
  return (
    <span className="inline-flex items-center gap-2.5 select-none">
      <svg width={size} height={size} viewBox="0 0 48 48" fill="none" aria-label="PSEmine emblem" className="shrink-0">
        <path d="M8 8L20 4V34L8 42V8Z" fill={MARK_JADE} />
        <path d="M22 4L38 12L42 16L22 24V4Z" fill={MARK_BONE} />
        <path d="M22 24L42 16L36 30L22 34V24Z" fill={MARK_STEEL} />
        <path d="M22 10L32 15L22 20V10Z" fill={MARK_CUT} />
        <path d="M22 37L32 32L36 35L22 44V37Z" fill={MARK_JADE_DEEP} />
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

/** Branded loader — the emblem breathing, not a generic spinner. */
export function PSELoader({ label = 'Loading', size = 40 }: { label?: string; size?: number }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3.5" role="status" aria-live="polite" aria-label={label}>
      <svg width={size} height={size} viewBox="0 0 48 48" fill="none" aria-hidden="true">
        <path d="M8 8L20 4V34L8 42V8Z" fill={MARK_JADE} opacity="0.9">
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
 * One drawing language, four topologies. Geometry is expressed on a 120×72
 * viewBox so every tier shares a baseline and a scale.
 * ─────────────────────────────────────────────────────────────────────────── */

export type ModuleTier = 1 | 2 | 3 | 4;
export type ModuleState = 'available' | 'owned' | 'limit' | 'idle' | 'stopped';
export type DutyModel = 'session' | 'continuous';

const PLATE = '#16161A';
const EDGE = 'rgba(255,255,255,0.2)';
const EDGE_STRONG = 'rgba(255,255,255,0.3)';
const STEEL = 'rgba(255,255,255,0.1)';
const CORE_OFF = 'rgba(255,255,255,0.14)';
const CORE_ON = '#17A97A';
const CORE_HOT = '#4FD1A5';

const core = (x: number, y: number, w: number, h: number, on: boolean, hot = false) => (
  <rect key={`c${x}-${y}`} x={x} y={y} width={w} height={h} rx="1.5" fill={on ? (hot ? CORE_HOT : CORE_ON) : CORE_OFF} />
);

type MarkProps = { tier: ModuleTier; size?: number; active?: boolean; stopped?: boolean; className?: string };

/**
 * The machined object itself. `active` lights the core bars (the tool is inside
 * an operating duty cycle); `stopped` marks a session that ended without a
 * restart — the same amber the console uses for attention.
 */
export function ModuleMark({ tier, size = 160, active = false, stopped = false, className }: MarkProps) {
  const on = active && !stopped;
  const hot = on;
  const fill = stopped ? '#E0A03A' : undefined;
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
      {/* Baseline shadow plate: every module stands on the same ground line. */}
      <rect x="18" y="66" width="84" height="2" rx="1" fill={on ? 'rgba(23,169,122,0.35)' : STEEL} />

      {tier === 1 && (
        <>
          <rect x="46" y="24" width="28" height="24" rx="3" fill={PLATE} stroke={EDGE} />
          {core(51, 29, 18, 7, on, hot)}
          {core(51, 39, 18, 3, false)}
          <rect x="40" y="52" width="40" height="3" rx="1.5" fill={STEEL} />
        </>
      )}

      {tier === 2 && (
        <>
          <rect x="40" y="14" width="40" height="17" rx="3" fill={PLATE} stroke={EDGE} />
          <rect x="40" y="35" width="40" height="17" rx="3" fill={PLATE} stroke={EDGE} />
          <rect x="44" y="31.5" width="32" height="3" rx="1.5" fill={STEEL} />
          {core(45, 19, 14, 7, on, hot)}
          {core(45, 40, 14, 7, on, false)}
          <rect x="62" y="19" width="13" height="7" rx="1.5" fill={STEEL} />
          <rect x="62" y="40" width="13" height="7" rx="1.5" fill="rgba(255,255,255,0.07)" />
          <rect x="36" y="56" width="48" height="3" rx="1.5" fill={STEEL} />
        </>
      )}

      {tier === 3 && (
        <>
          <rect x="24" y="16" width="24" height="32" rx="3" fill={PLATE} stroke={EDGE_STRONG} />
          <rect x="48" y="16" width="24" height="32" rx="3" fill={PLATE} stroke={EDGE_STRONG} />
          <rect x="72" y="16" width="24" height="32" rx="3" fill={PLATE} stroke={EDGE_STRONG} />
          {core(29, 21, 14, 6, on, hot)}
          {core(53, 21, 14, 6, on, false)}
          {core(77, 21, 14, 6, on, false)}
          {[31, 36, 41].map(y => (
            <rect key={y} x="29" y={y} width="60" height="2" rx="1" fill="rgba(255,255,255,0.07)" />
          ))}
          <rect x="24" y="52" width="72" height="3" rx="1.5" fill={STEEL} />
          <circle cx="92" cy="53.5" r="2" fill={stopped ? '#E0A03A' : on ? CORE_HOT : CORE_OFF} />
        </>
      )}

      {tier === 4 && (
        <>
          {/* Crest bar: flagships are marked at the top, not by being huge. */}
          <rect x="38" y="5" width="44" height="4" rx="2" fill={stopped ? '#E0A03A' : on ? CORE_HOT : 'rgba(255,255,255,0.22)'} />
          <rect x="26" y="14" width="68" height="38" rx="4" fill={PLATE} stroke={EDGE_STRONG} />
          <rect x="59.5" y="14" width="1" height="38" fill="rgba(255,255,255,0.09)" />
          {core(32, 21, 25, 12, on, hot)}
          {core(63, 21, 25, 12, on, false)}
          <rect x="32" y="38" width="56" height="2.5" rx="1.25" fill="rgba(255,255,255,0.08)" />
          <rect x="32" y="44" width="40" height="2.5" rx="1.25" fill="rgba(255,255,255,0.055)" />
          <rect x="30" y="56" width="60" height="3" rx="1.5" fill={STEEL} />
        </>
      )}

      {/* Amber spine marks a session tool that finished without a restart. */}
      {stopped && <rect x="24" y="62" width="72" height="2" rx="1" fill={fill} />}
    </svg>
  );
}

/** Ownership ticks — the tier's real per-account limit, filled to owned. */
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
 * session    → four discrete segments, lit while the cycle is open
 * continuous → one unbroken rail (Elite never needs a manual restart)
 */
export function DutySegments({ duty, running, stopped }: { duty: DutyModel; running: boolean; stopped?: boolean }) {
  const segments = duty === 'continuous' ? 5 : 4;
  return (
    <span className="pse-dutyseg" data-continuous={duty === 'continuous' ? 'true' : 'false'} data-stopped={stopped ? 'true' : 'false'} aria-hidden="true">
      {Array.from({ length: segments }, (_, i) => (
        <span key={i} data-on={running && !stopped ? 'true' : 'false'} />
      ))}
    </span>
  );
}

const dutyLabel = (duty: DutyModel) => (duty === 'continuous' ? 'Continuous duty' : 'Session duty · 24h');

/**
 * ModulePlate — the module family member as a product: object, nameplate,
 * capacity, ownership and duty, in one unit of presentation. Used by the
 * marketplace, the landing spec sheet and the day-0 decision aid.
 */
export function ModulePlate({
  tier, name, rateGBPPerHour, priceGBP, maxPerUser, owned = 0, duty,
  state = 'available', artSize = 200, children,
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
        <DutySegments duty={duty} running={running} stopped={stopped} />
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

/**
 * TEMPORARY compatibility alias (migration step 3 → 14).
 *
 * Routes not yet migrated still ask for `MinerArt`. It now renders the
 * approved module object, so no surface can show the retired grey-box
 * illustrations. Deleted together with the old composition primitives once the
 * last route is migrated.
 */
export function MinerArt({ tier, size = 96, className, active = true }: { tier: ModuleTier; size?: number; className?: string; active?: boolean }) {
  return <ModuleMark tier={tier} size={size} active={active} className={className} />;
}
