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

/** STARTER — compact, single module, approachable. */
export function MinerArtStarter({ size = 96, className }: MinerArtProps) {
  return (
    <MinerFrame size={size} className={className}>
      <rect x="30" y="38" width="36" height="28" rx="4" fill="url(#pse-mn-body)" stroke="rgba(255,255,255,0.14)" />
      <rect x="36" y="45" width="14" height="14" rx="2.5" fill="url(#pse-mn-face)" opacity="0.9" />
      <rect x="55" y="45" width="6" height="6" rx="1.5" fill="rgba(255,255,255,0.18)" />
      <rect x="55" y="53" width="6" height="6" rx="1.5" fill="rgba(255,255,255,0.12)" />
      <rect x="34" y="70" width="28" height="4" rx="2" fill="rgba(255,255,255,0.10)" />
    </MinerFrame>
  );
}

/** BUILDER — taller, modular stack. */
export function MinerArtBuilder({ size = 96, className }: MinerArtProps) {
  return (
    <MinerFrame size={size} className={className}>
      <rect x="26" y="30" width="44" height="16" rx="4" fill="url(#pse-mn-body)" stroke="rgba(255,255,255,0.14)" />
      <rect x="26" y="50" width="44" height="16" rx="4" fill="url(#pse-mn-body)" stroke="rgba(255,255,255,0.14)" />
      <rect x="33" y="34" width="12" height="8" rx="2" fill="url(#pse-mn-face)" opacity="0.9" />
      <rect x="33" y="54" width="12" height="8" rx="2" fill="url(#pse-mn-core)" opacity="0.85" />
      <rect x="52" y="34" width="12" height="8" rx="2" fill="rgba(255,255,255,0.14)" />
      <rect x="52" y="54" width="12" height="8" rx="2" fill="rgba(255,255,255,0.10)" />
      <rect x="30" y="70" width="36" height="4" rx="2" fill="rgba(255,255,255,0.10)" />
    </MinerFrame>
  );
}

/** ADVANCED — dense rack, vents, technical. */
export function MinerArtAdvanced({ size = 96, className }: MinerArtProps) {
  return (
    <MinerFrame size={size} className={className}>
      <rect x="22" y="26" width="52" height="40" rx="5" fill="url(#pse-mn-body)" stroke="rgba(255,255,255,0.16)" />
      <rect x="28" y="32" width="16" height="10" rx="2" fill="url(#pse-mn-face)" />
      <rect x="48" y="32" width="20" height="10" rx="2" fill="url(#pse-mn-core)" opacity="0.8" />
      <rect x="28" y="46" width="40" height="3" rx="1.5" fill="rgba(255,255,255,0.14)" />
      <rect x="28" y="52" width="40" height="3" rx="1.5" fill="rgba(255,255,255,0.10)" />
      <rect x="28" y="58" width="28" height="3" rx="1.5" fill="rgba(255,255,255,0.07)" />
      <circle cx="68" cy="59" r="3" fill="#22D3EE" opacity="0.85" />
      <rect x="26" y="70" width="44" height="4" rx="2" fill="rgba(255,255,255,0.10)" />
    </MinerFrame>
  );
}

/** ELITE — flagship dual-bay with crest, visually dominant. */
export function MinerArtElite({ size = 96, className }: MinerArtProps) {
  return (
    <MinerFrame size={size} className={className}>
      <path d="M30 18L48 12L66 18V24L48 19L30 24V18Z" fill="url(#pse-mn-face)" opacity="0.9" />
      <rect x="20" y="30" width="56" height="36" rx="6" fill="url(#pse-mn-body)" stroke="rgba(255,255,255,0.18)" />
      <rect x="27" y="37" width="18" height="20" rx="3" fill="url(#pse-mn-face)" />
      <rect x="51" y="37" width="18" height="20" rx="3" fill="url(#pse-mn-core)" />
      <rect x="27" y="60" width="42" height="2.5" rx="1.25" fill="rgba(255,255,255,0.12)" />
      <circle cx="72" cy="61" r="2.5" fill="#F5A524" opacity="0.9" />
      <rect x="24" y="70" width="48" height="4" rx="2" fill="rgba(255,255,255,0.12)" />
      <rect x="38" y="76" width="20" height="3" rx="1.5" fill="rgba(255,255,255,0.08)" />
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
