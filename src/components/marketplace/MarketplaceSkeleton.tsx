import React from 'react';

export const MarketplaceSkeleton: React.FC = () => {
  return (
    <div className="space-y-6 animate-pulse" aria-busy="true" aria-label="Loading marketplace">
      {/* Categories skeleton strip */}
      <div className="flex gap-2 overflow-hidden pb-1">
        {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
          <div key={i} className="h-10 w-24 rounded-xl bg-surface border border-border shrink-0" />
        ))}
      </div>

      {/* Search & Filter toolbar skeleton */}
      <div className="p-3 rounded-2xl bg-surface border border-border flex flex-col sm:flex-row gap-3">
        <div className="h-11 bg-surface-bright rounded-xl flex-1" />
        <div className="flex gap-2">
          <div className="h-11 w-32 bg-surface-bright rounded-xl" />
          <div className="h-11 w-32 bg-surface-bright rounded-xl" />
        </div>
      </div>

      {/* Grid section 1 skeleton */}
      <div className="space-y-3">
        <div className="flex justify-between items-center border-b border-border/60 pb-2">
          <div className="h-5 w-40 bg-surface-bright rounded-md" />
          <div className="h-4 w-20 bg-surface-bright rounded-md" />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div
              key={i}
              className="p-4 rounded-2xl border border-border bg-surface flex flex-col justify-between space-y-4 min-h-[170px]"
            >
              <div className="space-y-2.5">
                <div className="flex justify-between items-center">
                  <div className="h-4 w-20 bg-surface-bright rounded-md" />
                  <div className="h-4 w-12 bg-surface-bright rounded-md" />
                </div>
                <div className="h-4 w-3/4 bg-surface-bright rounded-md" />
                <div className="h-3 w-full bg-surface-bright rounded-md" />
              </div>
              <div className="pt-3 border-t border-border/60 flex justify-between items-center">
                <div className="h-5 w-24 bg-surface-bright rounded-md" />
                <div className="h-8 w-20 bg-surface-bright rounded-xl" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
