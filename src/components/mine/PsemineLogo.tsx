import React from 'react';

interface PsemineLogoProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export const PsemineLogo: React.FC<PsemineLogoProps> = ({ size = 'md', className = '' }) => {
  const iconSizes = {
    sm: 'w-6 h-6',
    md: 'w-9 h-9',
    lg: 'w-12 h-12'
  };

  const textSizes = {
    sm: 'text-base',
    md: 'text-xl',
    lg: 'text-3xl'
  };

  return (
    <div className={`flex items-center gap-3 select-none ${className}`}>
      {/* Icon */}
      <div className={`${iconSizes[size]} relative flex items-center justify-center`}>
        {/* Glow */}
        <div className="absolute inset-0 bg-[#00F2FE]/20 rounded-xl blur-md" />

        {/* Diamond / Node Container */}
        <div className="relative w-full h-full bg-gradient-to-br from-[#0B1528] via-[#09101D] to-[#040810] border border-[#00F2FE]/30 rounded-xl flex items-center justify-center shadow-[0_0_15px_rgba(0,242,254,0.15)]">
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            className="w-1/2 h-1/2 text-[#00F2FE]"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <polygon points="12 2 2 7 12 12 22 7 12 2" />
            <polyline points="2 17 12 22 22 17" />
            <polyline points="2 12 12 17 22 12" />
          </svg>
        </div>
      </div>

      {/* Typography */}
      <div className={`font-black tracking-wider ${textSizes[size]}`}>
        <span className="text-white">PSE</span>
        <span className="text-[#00F2FE] ml-0.5 drop-shadow-[0_0_12px_rgba(0,242,254,0.4)]">MINE</span>
      </div>
    </div>
  );
};

export default PsemineLogo;
