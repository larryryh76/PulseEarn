/**
 * SkeletonLoader
 * 
 * Premium skeleton loading components for the Marketplace.
 * Provides visual feedback during data loading states.
 */

import React from 'react';
import { motion } from 'framer-motion';
import { cn } from '../../utils';

// ─── Base Skeleton ─────────────────────────────────────────────────────────────

interface SkeletonProps {
  className?: string;
  animation?: 'pulse' | 'wave' | 'none';
}

export const Skeleton: React.FC<SkeletonProps> = ({
  className,
  animation = 'pulse',
}) => {
  return (
    <div
      className={cn(
        'bg-surface-bright rounded-lg',
        animation === 'pulse' && 'animate-pulse',
        animation === 'wave' && 'animate-shimmer',
        className
      )}
    />
  );
};

// ─── Opportunity Card Skeletons ───────────────────────────────────────────────

interface OpportunityCardSkeletonProps {
  variant?: 'default' | 'compact' | 'featured' | 'row';
  count?: number;
  className?: string;
}

export const OpportunityCardSkeleton: React.FC<OpportunityCardSkeletonProps> = ({
  variant = 'default',
  count = 1,
  className,
}) => {
  const items = Array.from({ length: count }, (_, i) => i);

  if (variant === 'featured') {
    return (
      <div className={cn('grid grid-cols-1 md:grid-cols-2 gap-4', className)}>
        {items.map(i => (
          <FeaturedCardSkeleton key={i} />
        ))}
      </div>
    );
  }

  if (variant === 'row') {
    return (
      <div className={cn('space-y-3', className)}>
        {items.map(i => (
          <RowCardSkeleton key={i} />
        ))}
      </div>
    );
  }

  if (variant === 'compact') {
    return (
      <div className={cn('grid grid-cols-2 md:grid-cols-4 gap-3', className)}>
        {items.map(i => (
          <CompactCardSkeleton key={i} />
        ))}
      </div>
    );
  }

  return (
    <div className={cn('grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4', className)}>
      {items.map(i => (
        <DefaultCardSkeleton key={i} />
      ))}
    </div>
  );
};

// ─── Individual Skeleton Cards ────────────────────────────────────────────────

const DefaultCardSkeleton: React.FC = () => (
  <motion.div
    initial={{ opacity: 0 }}
    animate={{ opacity: 1 }}
    className="rounded-2xl border border-border bg-surface overflow-hidden"
  >
    <div className="p-5 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <Skeleton className="h-3 w-20" />
        <Skeleton className="h-5 w-14 rounded-full" />
      </div>

      {/* Title + Description */}
      <div className="space-y-2">
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-3 w-3/4" />
      </div>

      {/* Time */}
      <Skeleton className="h-3 w-16" />

      {/* Footer */}
      <div className="flex items-center justify-between pt-3 border-t border-white/5">
        <div className="space-y-1">
          <Skeleton className="h-6 w-24" />
          <Skeleton className="h-3 w-12" />
        </div>
        <Skeleton className="h-8 w-20 rounded-xl" />
      </div>
    </div>
  </motion.div>
);

const CompactCardSkeleton: React.FC = () => (
  <motion.div
    initial={{ opacity: 0 }}
    animate={{ opacity: 1 }}
    className="rounded-xl border border-border bg-surface p-3"
  >
    <div className="flex items-start justify-between gap-2">
      <div className="flex-1 space-y-2">
        <Skeleton className="h-2 w-12" />
        <Skeleton className="h-3 w-full" />
      </div>
      <Skeleton className="w-8 h-8 rounded-lg" />
    </div>
    <div className="flex items-center justify-between mt-3 pt-2 border-t border-white/5">
      <div className="flex items-center gap-2">
        <Skeleton className="h-4 w-14" />
        <Skeleton className="h-2 w-8" />
      </div>
      <Skeleton className="h-3 w-10" />
    </div>
  </motion.div>
);

const FeaturedCardSkeleton: React.FC = () => (
  <motion.div
    initial={{ opacity: 0 }}
    animate={{ opacity: 1 }}
    className="relative rounded-3xl border border-white/5 bg-gradient-to-br from-[#12121A] to-[#0A0A0F] overflow-hidden min-h-[200px]"
  >
    {/* Decorative */}
    <div className="absolute top-0 right-0 w-44 h-44 bg-primary/10 rounded-full blur-[60px]" />
    
    <div className="relative p-6 space-y-4 min-h-[200px] flex flex-col justify-between">
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <Skeleton className="h-6 w-20 rounded-full" />
          <Skeleton className="h-3 w-16" />
        </div>
        <Skeleton className="h-5 w-full" />
        <Skeleton className="h-3 w-full" />
        <Skeleton className="h-3 w-2/3" />
      </div>

      <div className="flex items-end justify-between pt-4 border-t border-white/5">
        <div className="space-y-1">
          <Skeleton className="h-2 w-20" />
          <Skeleton className="h-6 w-24" />
        </div>
        <Skeleton className="h-10 w-24 rounded-xl" />
      </div>
    </div>
  </motion.div>
);

const RowCardSkeleton: React.FC = () => (
  <motion.div
    initial={{ opacity: 0 }}
    animate={{ opacity: 1 }}
    className="flex items-center justify-between p-4 rounded-xl border border-border bg-surface"
  >
    <div className="flex items-center gap-4">
      <Skeleton className="w-10 h-10 rounded-xl" />
      <div className="space-y-1">
        <Skeleton className="h-3 w-32" />
        <Skeleton className="h-2 w-48" />
      </div>
    </div>
    <div className="flex items-center gap-4">
      <div className="text-right space-y-1">
        <Skeleton className="h-4 w-16" />
        <Skeleton className="h-2 w-12" />
      </div>
      <Skeleton className="w-8 h-8 rounded-lg" />
    </div>
  </motion.div>
);

// ─── Section Skeleton ──────────────────────────────────────────────────────────

interface SectionSkeletonProps {
  title?: boolean | string;
  subtitle?: boolean | string;
  layout?: 'hero' | 'featured' | 'grid' | 'slider' | 'row';
  count?: number;
  className?: string;
}

export const SectionSkeleton: React.FC<SectionSkeletonProps> = ({
  title = true,
  subtitle = true,
  layout = 'grid',
  count = 4,
  className,
}) => {
  return (
    <div className={cn('space-y-6', className)}>
      {/* Header */}
      {(title || subtitle) && (
        <div className="space-y-2">
          {title && <Skeleton className="h-6 w-48" />}
          {subtitle && <Skeleton className="h-4 w-32" />}
        </div>
      )}

      {/* Content */}
      {layout === 'hero' || layout === 'featured' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {Array.from({ length: 2 }, (_, i) => (
            <FeaturedCardSkeleton key={i} />
          ))}
        </div>
      ) : layout === 'slider' ? (
        <div className="flex gap-4 overflow-hidden">
          {Array.from({ length: count }, (_, i) => (
            <div key={i} className="w-[280px] shrink-0">
              <DefaultCardSkeleton />
            </div>
          ))}
        </div>
      ) : layout === 'row' ? (
        <div className="space-y-3">
          {Array.from({ length: count }, (_, i) => (
            <RowCardSkeleton key={i} />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {Array.from({ length: count }, (_, i) => (
            <DefaultCardSkeleton key={i} />
          ))}
        </div>
      )}
    </div>
  );
};

// ─── Full Page Skeleton ────────────────────────────────────────────────────────

export const MarketplacePageSkeleton: React.FC = () => (
  <div className="space-y-8">
    {/* Hero Section */}
    <SectionSkeleton layout="hero" count={2} />

    {/* Slider Section */}
    <SectionSkeleton layout="slider" title subtitle={false} count={4} />

    {/* Grid Section */}
    <SectionSkeleton layout="grid" title subtitle count={6} />

    {/* Another Slider */}
    <SectionSkeleton layout="slider" title subtitle={false} count={4} />
  </div>
);

// ─── Filter Bar Skeleton ──────────────────────────────────────────────────────

export const FilterBarSkeleton: React.FC = () => (
  <div className="flex items-center gap-3 overflow-x-auto pb-2">
    {Array.from({ length: 8 }, (_, i) => (
      <Skeleton key={i} className="h-9 w-24 rounded-full shrink-0" />
    ))}
  </div>
);

// ─── Search Bar Skeleton ──────────────────────────────────────────────────────

export const SearchBarSkeleton: React.FC = () => (
  <div className="relative">
    <Skeleton className="h-12 w-full rounded-xl" />
    <div className="absolute inset-y-0 right-0 flex items-center pr-4">
      <Skeleton className="h-6 w-6 rounded-md" />
    </div>
  </div>
);

// ─── Provider Status Skeleton ─────────────────────────────────────────────────

export const ProviderStatusSkeleton: React.FC = () => (
  <div className="flex items-center gap-2 p-3 rounded-lg border border-border bg-surface">
    <Skeleton className="w-8 h-8 rounded-full" />
    <div className="space-y-1">
      <Skeleton className="h-3 w-24" />
      <Skeleton className="h-2 w-16" />
    </div>
    <Skeleton className="ml-auto h-2 w-2 rounded-full" />
  </div>
);

export default {
  Skeleton,
  OpportunityCardSkeleton,
  SectionSkeleton,
  MarketplacePageSkeleton,
  FilterBarSkeleton,
  SearchBarSkeleton,
  ProviderStatusSkeleton,
};
