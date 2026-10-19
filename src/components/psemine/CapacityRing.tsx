import React from 'react';

type CapacityRingProps = {
  value: number;           // current value (e.g. GBP/hour capacity)
  max?: number;            // maximum reference value for ring (optional)
  size?: number;           // px size of the SVG (default 56)
  strokeWidth?: number;    // ring stroke width
  primary?: string;        // primary color (fallback to CSS var)
  bg?: string;             // background ring color
  label?: string;          // small label to show under or inside ring
  className?: string;
  ariaLabel?: string;
};

const CapacityRing: React.FC<CapacityRingProps> = ({
  value,
  max = 100,
  size = 56,
  strokeWidth = 6,
  primary = 'var(--pse-primary)',
  bg = 'rgba(255,255,255,0.04)',
  label,
  className = '',
  ariaLabel = 'Capacity',
}) => {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  // Clamp percent between 0 and 100.
  const percent = Math.max(0, Math.min(100, (max > 0 ? (value / max) * 100 : 0)));
  const offset = circumference * (1 - percent / 100);

  const formattedValue = Number.isFinite(value) ? value : 0;

  return (
    <div className={`pse-capacity-ring ${className}`} role="img" aria-label={ariaLabel} style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden="true" focusable="false">
        <defs>
          <linearGradient id="pseCapacityGrad" x1="0" x2="1">
            <stop offset="0%" stopColor={primary} stopOpacity="0.95" />
            <stop offset="100%" stopColor={primary} stopOpacity="0.8" />
          </linearGradient>
        </defs>

        {/* Background ring */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={bg}
          strokeWidth={strokeWidth}
          fill="none"
        />

        {/* Foreground progress ring */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="url(#pseCapacityGrad)"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
          fill="none"
        />
      </svg>

      {/* Center figure */}
      <div style={{
        position: 'relative',
        marginTop: -size,
        width: size,
        height: size,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        pointerEvents: 'none',
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontFamily: 'var(--pse-font-mono)', fontSize: 12, color: 'var(--pse-ink-dim)' }}>
            {label ?? 'Capacity'}
          </div>
          <div style={{ fontFamily: 'var(--pse-font-mono)', fontWeight: 700, fontSize: 14, color: 'var(--pse-ink)' }}>
            {formattedValue}
          </div>
        </div>
      </div>
    </div>
  );
};

export default CapacityRing;
