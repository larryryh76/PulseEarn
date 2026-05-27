import React from 'react';
import { cn } from '../../utils';

interface SkeletonProps {
  className?: string;
  variant?: 'rectangular' | 'circular' | 'text';
}

const Skeleton: React.FC<SkeletonProps> = ({ className, variant = 'rectangular' }) => {
  return (
    <div
      className={cn(
        "animate-pulse bg-white/5",
        variant === 'circular' ? "rounded-full" : "rounded-xl",
        className
      )}
    />
  );
};

export default Skeleton;
