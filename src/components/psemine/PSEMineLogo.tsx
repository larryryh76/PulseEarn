import React from 'react';

interface PSEMineLogoProps {
  size?: number;
  showWordmark?: boolean;
  className?: string;
  iconOnly?: boolean;
}

/**
 * PSEMine Original Vector Identity Mark
 * 
 * An original, sharp-geometry crypto emblem composed of precision angled facets 
 * and distinctive negative space forming an interlocking dynamic capacity prism (P-E monogram).
 * Designed for crisp rendering at 16px, 24px, 32px, 48px and large hero displays.
 * NO generic coins, NO pickaxes, NO raster art.
 */
export const PSEMineLogo: React.FC<PSEMineLogoProps> = ({
  size = 32,
  showWordmark = true,
  className = '',
  iconOnly = false
}) => {
  return (
    <div className={`inline-flex items-center gap-2.5 select-none ${className}`}>
      {/* Precision Vector Emblem */}
      <svg
        width={size}
        height={size}
        viewBox="0 0 48 48"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="shrink-0 transition-transform duration-200 hover:scale-105"
        aria-label="PSEmine Brand Emblem"
      >
        <defs>
          {/* Primary Crisp Brand Gradients */}
          <linearGradient id="psemine-facet-alpha" x1="6" y1="6" x2="42" y2="42" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#00E599" />
            <stop offset="100%" stopColor="#00B4D8" />
          </linearGradient>
          <linearGradient id="psemine-facet-beta" x1="12" y1="4" x2="36" y2="38" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#05F5A4" />
            <stop offset="100%" stopColor="#0077B6" />
          </linearGradient>
          <linearGradient id="psemine-facet-gamma" x1="18" y1="16" x2="44" y2="44" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#00C48C" />
            <stop offset="100%" stopColor="#005B94" />
          </linearGradient>
        </defs>

        {/* Outer Faceted Geometric Shield / Node */}
        {/* Left Vertical Spine & Angled Base */}
        <path
          d="M8 8L20 4V34L8 42V8Z"
          fill="url(#psemine-facet-alpha)"
        />

        {/* Upper Dynamic Forward Fin (forming top of P loop) */}
        <path
          d="M22 4L38 12L42 16L22 24V4Z"
          fill="url(#psemine-facet-beta)"
        />

        {/* Lower Converging Facet (completing the P loop and defining inner E vector) */}
        <path
          d="M22 24L42 16L36 30L22 34V24Z"
          fill="url(#psemine-facet-gamma)"
        />

        {/* Angular Negative Space Core Anchor */}
        <path
          d="M22 10L32 15L22 20V10Z"
          fill="#090D14"
          className="dark:fill-[#090D14] fill-[#F8FAFC]"
        />

        {/* Bottom Precision Energy Counter-weight */}
        <path
          d="M22 37L32 32L36 35L22 44V37Z"
          fill="url(#psemine-facet-alpha)"
          opacity="0.85"
        />
      </svg>

      {/* Branded Wordmark */}
      {showWordmark && !iconOnly && (
        <div className="flex flex-col justify-center leading-none">
          <div className="flex items-baseline gap-1 font-mono tracking-tight">
            <span className="text-[17px] font-black text-text-primary tracking-wider uppercase font-sans">
              PSE<span className="text-primary font-bold">mine</span>
            </span>
            <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse ml-0.5" />
          </div>
          <span className="text-[9px] font-extrabold uppercase tracking-[0.25em] text-text-tertiary">
            Web3 Campaign
          </span>
        </div>
      )}
    </div>
  );
};

export default PSEMineLogo;
