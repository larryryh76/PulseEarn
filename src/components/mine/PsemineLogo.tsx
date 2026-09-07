import React from 'react';

interface PsemineLogoProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export const PsemineLogo: React.FC<PsemineLogoProps> = ({ size = 'md', className = '' }) => {
  const iconSizes = { sm: 'psemine-mark-sm', md: 'psemine-mark-md', lg: 'psemine-mark-lg' };
  const textSizes = { sm: 'psemine-wordmark-sm', md: 'psemine-wordmark-md', lg: 'psemine-wordmark-lg' };

  return (
    <div className={`psemine-logo ${className}`} aria-label="PSEmine">
      <div className={`psemine-mark ${iconSizes[size]}`} aria-hidden="true">
        <span className="psemine-mark-core" />
        <span className="psemine-mark-line psemine-mark-line-a" />
        <span className="psemine-mark-line psemine-mark-line-b" />
        <span className="psemine-mark-line psemine-mark-line-c" />
      </div>
      <div className={`psemine-wordmark ${textSizes[size]}`}>
        <span>PSE</span><strong>MINE</strong>
      </div>
    </div>
  );
};

export default PsemineLogo;
