/**
 * PSEmine brand identity assets — custom SVG, zero dependencies.
 *
 * The monogram is the strongest prior mark (angular faceted "PSE" emblem,
 * recovered from git history and refined) restored as product identity.
 * The four miner illustrations are conceptual product-tier visuals: they
 * communicate size/density/premium-ness only — no fabricated specifications
 * (no hash rate, hardware, or manufacturer claims).
 */
import React from 'react';

/* ── Brand mark ─────────────────────────────────────────────────────── */

export function PSELogo({ size = 32, withWordmark = false }: { size?: number; withWordmark?: boolean }) {
  return (
    <span className="inline-flex items-center gap-2.5 select-none">
      <svg width={size} height={size} viewBox="0 0 48 48" fill="none" aria-label="PSEmine emblem" className="shrink-0">
        <defs>
          <linearGradient id="pse-lg-a" x1="6" y1="6" x2="42" y2="42" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#2E90FA" /><stop offset="100%" stopColor="#22D3EE" />
          </linearGradient>
          <linearGradient id="pse-lg-b" x1="12" y1="4" x2="36" y2="38" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#5AB2FC" /><stop offset="100%" stopColor="#1570EF" />
          </linearGradient>
          <linearGradient id="pse-lg-c" x1="18" y1="16" x2="44" y2="44" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#8B7CF6" /><stop offset="100%" stopColor="#2E90FA" />
          </linearGradient>
        </defs>
        <path d="M8 8L20 4V34L8 42V8Z" fill="url(#pse-lg-a)" />
        <path d="M22 4L38 12L42 16L22 24V4Z" fill="url(#pse-lg-b)" />
        <path d="M22 24L42 16L36 30L22 34V24Z" fill="url(#pse-lg-c)" />
        <path d="M22 10L32 15L22 20V10Z" fill="#0B0E13" />
        <path d="M22 37L32 32L36 35L22 44V37Z" fill="url(#pse-lg-a)" opacity="0.85" />
      </svg>
      {withWordmark && (
        <span className="flex flex-col leading-none">
          <span className="text-[15px] font-bold tracking-tight" style={{ color: 'var(--pse-text)' }}>
            PSE<span style={{ color: 'var(--pse-blue)' }}>mine</span>
          </span>
          <span className="text-[8px] font-bold uppercase" style={{ letterSpacing: '0.24em', color: 'var(--pse-text-3)' }}>
            90-Day Campaign
          </span>
        </span>
      )}
    </span>
  );
}

/* ── Miner illustrations — conceptual tier visuals ────────────────────
   Shared language: an angled mining unit drawn from the same palette as the
   brand mark. Starter = compact single module; Builder = taller, modular;
   Advanced = dense rack with vents; Elite = flagship dual-bay with crest.
   Props only change geometry and detail density — never specifications.  */

type MinerArtProps = { size?: number; className?: string };

function MinerFrame({ children, size = 96, className }: MinerArtProps & { children: React.ReactNode }) {
  return (
    <svg width={size} height={size} viewBox="0 0 96 96" fill="none" className={className} aria-hidden="true">
      <defs>
        <linearGradient id="pse-mn-body" x1="20" y1="16" x2="76" y2="84" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#1A2130" /><stop offset="100%" stopColor="#10141C" />
        </linearGradient>
        <linearGradient id="pse-mn-face" x1="24" y1="20" x2="72" y2="60" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#4C9EF8" /><stop offset="100%" stopColor="#22D3EE" />
        </linearGradient>
        <linearGradient id="pse-mn-core" x1="30" y1="30" x2="66" y2="66" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#8B7CF6" /><stop offset="100%" stopColor="#2E90FA" />
        </linearGradient>
      </defs>
      {children}
    </svg>
  );
}

/** STARTER — compact, single module, high-precision industrial silhouette. */
export function MinerArtStarter({ size = 96, className }: MinerArtProps) {
  return (
    <MinerFrame size={size} className={className}>
      <rect x="22" y="32" width="52" height="36" rx="4" fill="url(#pse-mn-body)" stroke="rgba(126,182,250,0.3)" strokeWidth="1" />
      <rect x="26" y="36" width="20" height="20" rx="2" fill="#0D131C" stroke="rgba(255,255,255,0.1)" />
      <circle cx="36" cy="46" r="6" fill="none" stroke="url(#pse-mn-face)" strokeWidth="2" />
      <circle cx="36" cy="46" r="2" fill="var(--pse-blue-ink)" />
      <rect x="50" y="38" width="18" height="4" rx="1" fill="rgba(255,255,255,0.15)" />
      <rect x="50" y="45" width="18" height="4" rx="1" fill="rgba(255,255,255,0.15)" />
      <rect x="50" y="52" width="12" height="4" rx="1" fill="url(#pse-mn-face)" opacity="0.8" />
      <rect x="26" y="60" width="44" height="4" rx="1" fill="#090D14" />
      <circle cx="30" cy="62" r="1" fill="var(--pse-green-ink)" />
      <circle cx="34" cy="62" r="1" fill="var(--pse-green-ink)" />
      <rect x="24" y="72" width="48" height="2" rx="1" fill="rgba(255,255,255,0.1)" />
    </MinerFrame>
  );
}

/** BUILDER — dual-bay modular stack. */
export function MinerArtBuilder({ size = 96, className }: MinerArtProps) {
  return (
    <MinerFrame size={size} className={className}>
      <rect x="18" y="24" width="60" height="22" rx="4" fill="url(#pse-mn-body)" stroke="rgba(255,255,255,0.16)" />
      <rect x="18" y="50" width="60" height="22" rx="4" fill="url(#pse-mn-body)" stroke="rgba(255,255,255,0.16)" />
      {/* Module 1 Face */}
      <circle cx="30" cy="35" r="5" fill="#0A0E15" stroke="url(#pse-mn-face)" strokeWidth="1.5" />
      <rect x="40" y="31" width="30" height="8" rx="1.5" fill="#0A0E15" stroke="rgba(255,255,255,0.08)" />
      <rect x="42" y="33" width="16" height="4" rx="1" fill="var(--pse-blue-ink)" opacity="0.9" />
      {/* Module 2 Face */}
      <circle cx="30" cy="61" r="5" fill="#0A0E15" stroke="url(#pse-mn-core)" strokeWidth="1.5" />
      <rect x="40" y="57" width="30" height="8" rx="1.5" fill="#0A0E15" stroke="rgba(255,255,255,0.08)" />
      <rect x="42" y="59" width="22" height="4" rx="1" fill="var(--pse-cyan-ink)" opacity="0.9" />
      {/* Connector Rail */}
      <line x1="22" y1="46" x2="22" y2="50" stroke="var(--pse-blue-ink)" strokeWidth="2" />
      <line x1="74" y1="46" x2="74" y2="50" stroke="var(--pse-blue-ink)" strokeWidth="2" />
    </MinerFrame>
  );
}

/** ADVANCED — dense multi-blade rack chassis. */
export function MinerArtAdvanced({ size = 96, className }: MinerArtProps) {
  return (
    <MinerFrame size={size} className={className}>
      <rect x="16" y="20" width="64" height="56" rx="5" fill="url(#pse-mn-body)" stroke="rgba(167,155,248,0.35)" strokeWidth="1" />
      {/* Blades */}
      <rect x="22" y="26" width="52" height="10" rx="2" fill="#0A0E15" stroke="rgba(255,255,255,0.1)" />
      <rect x="22" y="39" width="52" height="10" rx="2" fill="#0A0E15" stroke="rgba(255,255,255,0.1)" />
      <rect x="22" y="52" width="52" height="10" rx="2" fill="#0A0E15" stroke="rgba(255,255,255,0.1)" />
      {/* Indicators */}
      <circle cx="27" cy="31" r="2" fill="var(--pse-purple-ink)" />
      <circle cx="27" cy="44" r="2" fill="var(--pse-purple-ink)" />
      <circle cx="27" cy="57" r="2" fill="var(--pse-green-ink)" />
      {/* Vents */}
      <line x1="34" y1="31" x2="68" y2="31" stroke="rgba(255,255,255,0.2)" strokeWidth="1.5" strokeDasharray="3 2" />
      <line x1="34" y1="44" x2="68" y2="44" stroke="rgba(255,255,255,0.2)" strokeWidth="1.5" strokeDasharray="3 2" />
      <line x1="34" y1="57" x2="68" y2="57" stroke="rgba(255,255,255,0.2)" strokeWidth="1.5" strokeDasharray="3 2" />
      {/* Status Bar */}
      <rect x="22" y="66" width="52" height="4" rx="1" fill="#080B10" />
      <rect x="22" y="66" width="38" height="4" rx="1" fill="var(--pse-purple-ink)" />
    </MinerFrame>
  );
}

/** ELITE — flagship dual-tower engine console. */
export function MinerArtElite({ size = 96, className }: MinerArtProps) {
  return (
    <MinerFrame size={size} className={className}>
      {/* Chassis */}
      <rect x="12" y="16" width="72" height="64" rx="6" fill="url(#pse-mn-body)" stroke="rgba(95,223,240,0.45)" strokeWidth="1.5" />
      {/* Crest & Header */}
      <path d="M20 16L48 10L76 16" fill="none" stroke="var(--pse-cyan-ink)" strokeWidth="2" />
      {/* Dual Core Towers */}
      <rect x="18" y="24" width="26" height="42" rx="3" fill="#080C12" stroke="rgba(255,255,255,0.12)" />
      <rect x="52" y="24" width="26" height="42" rx="3" fill="#080C12" stroke="rgba(255,255,255,0.12)" />
      {/* Core Vanes */}
      <line x1="22" y1="32" x2="40" y2="32" stroke="url(#pse-mn-face)" strokeWidth="2" />
      <line x1="22" y1="40" x2="40" y2="40" stroke="url(#pse-mn-face)" strokeWidth="2" />
      <line x1="22" y1="48" x2="40" y2="48" stroke="url(#pse-mn-face)" strokeWidth="2" />
      <line x1="56" y1="32" x2="74" y2="32" stroke="url(#pse-mn-core)" strokeWidth="2" />
      <line x1="56" y1="40" x2="74" y2="40" stroke="url(#pse-mn-core)" strokeWidth="2" />
      <line x1="56" y1="48" x2="74" y2="48" stroke="url(#pse-mn-core)" strokeWidth="2" />
      {/* Central Matrix Gauge */}
      <rect x="46" y="28" width="4" height="34" rx="1" fill="#05080C" />
      <rect x="46" y="38" width="4" height="24" rx="1" fill="var(--pse-cyan-ink)" />
      {/* Lower Docking Base */}
      <rect x="18" y="70" width="60" height="4" rx="1" fill="#06090E" />
      <circle cx="22" cy="72" r="1.5" fill="var(--pse-green-ink)" />
      <circle cx="27" cy="72" r="1.5" fill="var(--pse-cyan-ink)" />
      <circle cx="74" cy="72" r="1.5" fill="var(--pse-amber-ink)" />
    </MinerFrame>
  );
}

export function MinerArt({ tier, size = 96, className }: { tier: 1 | 2 | 3 | 4; size?: number; className?: string }) {
  if (tier <= 1) return <MinerArtStarter size={size} className={className} />;
  if (tier === 2) return <MinerArtBuilder size={size} className={className} />;
  if (tier === 3) return <MinerArtAdvanced size={size} className={className} />;
  return <MinerArtElite size={size} className={className} />;
}

/* ── Branded loader — the monogram breathing, not a spinner ─────────── */

export function PSELoader({ label = 'Loading', size = 44 }: { label?: string; size?: number }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3.5" role="status" aria-live="polite" aria-label={label}>
      <svg width={size} height={size} viewBox="0 0 48 48" fill="none" aria-hidden="true">
        <defs>
          <linearGradient id="pse-ld-a" x1="6" y1="6" x2="42" y2="42" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#2E90FA" /><stop offset="100%" stopColor="#22D3EE" />
          </linearGradient>
          <linearGradient id="pse-ld-b" x1="12" y1="4" x2="36" y2="38" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#5AB2FC" /><stop offset="100%" stopColor="#1570EF" />
          </linearGradient>
          <linearGradient id="pse-ld-c" x1="18" y1="16" x2="44" y2="44" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#8B7CF6" /><stop offset="100%" stopColor="#2E90FA" />
          </linearGradient>
        </defs>
        <g>
          <path d="M8 8L20 4V34L8 42V8Z" fill="url(#pse-ld-a)" opacity="0.9">
            <animate attributeName="opacity" values="0.9;0.35;0.9" dur="1.6s" repeatCount="indefinite" />
          </path>
          <path d="M22 4L38 12L42 16L22 24V4Z" fill="url(#pse-ld-b)" opacity="0.9">
            <animate attributeName="opacity" values="0.9;0.35;0.9" dur="1.6s" begin="0.25s" repeatCount="indefinite" />
          </path>
          <path d="M22 24L42 16L36 30L22 34V24Z" fill="url(#pse-ld-c)" opacity="0.9">
            <animate attributeName="opacity" values="0.9;0.35;0.9" dur="1.6s" begin="0.5s" repeatCount="indefinite" />
          </path>
          <path d="M22 10L32 15L22 20V10Z" fill="#0B0E13" />
        </g>
      </svg>
      <span className="pse-micro" style={{ letterSpacing: '0.12em', textTransform: 'uppercase' }}>{label}…</span>
    </div>
  );
}
