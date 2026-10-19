import React from 'react';

type MiniSparklineProps = {
  data?: number[];
  width?: number;
  height?: number;
  stroke?: string;
  strokeWidth?: number;
  className?: string;
  title?: string;
};

const MiniSparkline: React.FC<MiniSparklineProps> = ({
  data = [],
  width = 160,
  height = 28,
  stroke = 'var(--pse-primary)',
  strokeWidth = 2,
  className = '',
  title = 'Earnings trend',
}) => {
  const w = Math.max(40, width);
  const h = Math.max(12, height);

  const points = data.length > 0 ? data : [0, 0, 0, 0, 0, 0];
  const min = Math.min(...points);
  const max = Math.max(...points);
  const range = max - min || 1;

  const step = w / (points.length - 1 || 1);

  const pathData = points
    .map((v, i) => {
      const x = Math.round(i * step);
      const y = Math.round(h - ((v - min) / range) * h);
      return `${x},${y}`;
    })
    .join(' ');

  return (
    <svg
      className={className}
      width={w}
      height={h}
      viewBox={`0 0 ${w} ${h}`}
      role="img"
      aria-label={title}
    >
      <polyline
        fill="none"
        stroke={stroke}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
        points={pathData}
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  );
};

export default MiniSparkline;
