import React from 'react';

type CapacityRingProps = {
  /** Current value (e.g. GBP/hour capacity). */
  value: number;
  /** Reference value the ring is measured against. */
  max?: number;
  /** px size of the SVG (default 48). */
  size?: number;
  strokeWidth?: number;
  primary?: string;
  bg?: string;
  /** Short figure printed in the middle. Omit to print the numeric value. */
  label?: string;
  className?: string;
  ariaLabel?: string;
};

/**
 * A single ratio, drawn. Used by the console status strip for the account's
 * hourly capacity, so the ring is read at a glance and never carries a
 * sentence: the centre holds one short figure, and the accessible name states
 * the full figure and its ceiling.
 */
const CapacityRing: React.FC<CapacityRingProps> = ({
  value,
  max = 100,
  size = 48,
  strokeWidth = 4,
  primary = 'var(--pse-accent-solid)',
  bg = 'var(--pse-inset)',
  label,
  className = '',
  ariaLabel = 'Capacity',
}) => {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const percent = max > 0 ? Math.max(0, Math.min(100, (value / max) * 100)) : 0;
  const offset = circumference * (1 - percent / 100);
  const centre = label ?? (Number.isFinite(value) ? value.toFixed(2) : '0.00');

  return (
    <div
      className={`pse-capacity-ring ${className}`.trim()}
      role="img"
      aria-label={ariaLabel}
      style={{ position: 'relative', display: 'inline-block', width: size, height: size, flex: '0 0 auto' }}
    >
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        aria-hidden="true"
        focusable="false"
        style={{ position: 'absolute', inset: 0 }}
      >
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={bg}
          strokeWidth={strokeWidth}
          fill="none"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={primary}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
          fill="none"
        />
      </svg>

      <span
        aria-hidden="true"
        style={{
          position: 'absolute',
          inset: strokeWidth,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontFamily: 'var(--pse-mono)',
          fontVariantNumeric: 'tabular-nums',
          fontSize: 9.5,
          fontWeight: 600,
          letterSpacing: '-0.01em',
          color: 'var(--pse-ink)',
          whiteSpace: 'nowrap',
        }}
      >
        {centre}
      </span>
    </div>
  );
};

export default CapacityRing;
