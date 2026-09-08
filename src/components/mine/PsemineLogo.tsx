import React from 'react';

interface PsemineLogoProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  showText?: boolean;
  className?: string;
}

export const PsemineLogo: React.FC<PsemineLogoProps> = ({
  size = 'md',
  showText = true,
  className = ''
}) => {
  const dimensions = {
    sm: { icon: 20, font: 'text-sm' },
    md: { icon: 28, font: 'text-base' },
    lg: { icon: 36, font: 'text-xl' },
    xl: { icon: 48, font: 'text-2xl' },
  }[size];

  return (
    <div className={`inline-flex items-center gap-2.5 select-none ${className}`} aria-label="PSEmine">
      {/* PulseEarn-family PSEmine Sub-Brand Logo Mark */}
      <div
        className="relative flex items-center justify-center rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 p-1.5 shadow-sm shadow-emerald-500/10"
        style={{ width: dimensions.icon + 12, height: dimensions.icon + 12 }}
      >
        <svg
          width={dimensions.icon}
          height={dimensions.icon}
          viewBox="0 0 32 32"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          {/* Subtle geometric mining node hexagon network */}
          <path
            d="M16 3L27.25 9.5V22.5L16 29L4.75 22.5V9.5L16 3Z"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinejoin="round"
            className="text-emerald-500/60"
          />
          <path
            d="M16 8L22.5 11.75V19.25L16 23L9.5 19.25V11.75L16 8Z"
            fill="currentColor"
            fillOpacity="0.15"
            stroke="currentColor"
            strokeWidth="1.5"
          />
          {/* Pulse energy core node */}
          <circle cx="16" cy="15.5" r="3.5" fill="currentColor" className="animate-pulse" />
          <path d="M16 19.5V25" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          <path d="M11 12.5L7 10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          <path d="M21 12.5L25 10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
      </div>

      {showText && (
        <div className={`font-bold tracking-tight text-white ${dimensions.font} flex items-center gap-1.5`}>
          <span className="text-emerald-400 font-extrabold tracking-wider">PSE</span>
          <span className="text-white font-bold">MINE</span>
          <span className="text-[9px] font-semibold uppercase tracking-widest px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 ml-0.5">
            PROD
          </span>
        </div>
      )}
    </div>
  );
};

export default PsemineLogo;
