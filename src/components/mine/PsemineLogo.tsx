import React from 'react';

interface PsemineLogoProps { size?: 'sm' | 'md' | 'lg'; className?: string; }

export const PsemineLogo: React.FC<PsemineLogoProps> = ({ size = 'md', className = '' }) => {
  const iconSizes = { sm: 'psemine-mark-sm', md: 'psemine-mark-md', lg: 'psemine-mark-lg' };
  const textSizes = { sm: 'psemine-wordmark-sm', md: 'psemine-wordmark-md', lg: 'psemine-wordmark-lg' };
  return <div className={`psemine-logo ${className}`} aria-label="PSEmine, a PulseEarn product">
    <div className={`psemine-mark ${iconSizes[size]}`} aria-hidden="true"><span className="psemine-mark-core" /><span className="psemine-mark-line psemine-mark-line-a" /><span className="psemine-mark-line psemine-mark-line-b" /></div>
    <div><div className={`psemine-wordmark ${textSizes[size]}`}><span>PSE</span><strong>MINE</strong></div><div className="mt-0.5 text-[8px] font-bold uppercase tracking-[0.18em] text-text-tertiary">PulseEarn product</div></div>
  </div>;
};
export default PsemineLogo;
