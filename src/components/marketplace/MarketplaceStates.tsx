import React from 'react';
import { Info, AlertTriangle, RefreshCw } from 'lucide-react';

interface MarketplaceEmptyStateProps {
  onResetFilters?: () => void;
  onRefresh?: () => void;
}

export const MarketplaceEmptyState: React.FC<MarketplaceEmptyStateProps> = ({
  onResetFilters,
  onRefresh,
}) => {
  return (
    <div className="p-8 sm:p-12 rounded-2xl border border-border bg-surface text-center space-y-3.5 max-w-xl mx-auto my-6">
      <div className="w-12 h-12 rounded-2xl bg-surface-bright border border-border flex items-center justify-center text-text-tertiary mx-auto">
        <Info size={24} />
      </div>
      <div className="space-y-1">
        <h3 className="text-sm sm:text-base font-bold text-text-primary">
          No earning opportunities available
        </h3>
        <p className="text-xs text-text-tertiary leading-relaxed">
          There are currently no opportunities matching your selected category, filters, or account region. Try selecting another category or check back later.
        </p>
      </div>

      <div className="pt-2 flex flex-wrap items-center justify-center gap-2">
        {onResetFilters && (
          <button
            onClick={onResetFilters}
            className="px-4 py-2 rounded-xl bg-primary text-white text-xs font-bold hover:bg-primary-hover transition-colors min-h-[38px]"
          >
            Reset Filters
          </button>
        )}
        {onRefresh && (
          <button
            onClick={onRefresh}
            className="px-4 py-2 rounded-xl bg-surface-bright border border-border text-xs font-bold text-text-secondary hover:text-text-primary transition-colors min-h-[38px]"
          >
            Refresh Opportunities
          </button>
        )}
      </div>
    </div>
  );
};

interface MarketplaceErrorStateProps {
  message?: string;
  onRetry?: () => void;
}

export const MarketplaceErrorState: React.FC<MarketplaceErrorStateProps> = ({
  message = 'Unable to load earning opportunities. Please try again.',
  onRetry,
}) => {
  return (
    <div className="p-6 sm:p-8 rounded-2xl border border-danger/20 bg-danger/5 text-center space-y-3 max-w-lg mx-auto my-6">
      <div className="w-10 h-10 rounded-xl bg-danger/10 border border-danger/20 flex items-center justify-center text-danger mx-auto">
        <AlertTriangle size={20} />
      </div>
      <div className="space-y-1">
        <h3 className="text-sm font-bold text-text-primary">Failed to load opportunities</h3>
        <p className="text-xs text-text-tertiary leading-relaxed">{message}</p>
      </div>

      {onRetry && (
        <div className="pt-1">
          <button
            onClick={onRetry}
            className="px-4 py-2 rounded-xl bg-surface border border-border text-xs font-bold text-text-primary hover:bg-surface-bright transition-colors inline-flex items-center gap-1.5 min-h-[38px]"
          >
            <RefreshCw size={13} />
            <span>Try Again</span>
          </button>
        </div>
      )}
    </div>
  );
};

export const MarketplaceSkeleton: React.FC = () => {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="h-28 rounded-2xl bg-surface border border-border/60 p-4 space-y-3">
        <div className="h-6 bg-surface-bright rounded-xl w-1/3" />
        <div className="h-4 bg-surface-bright rounded-xl w-2/3" />
      </div>

      <div className="space-y-4">
        <div className="h-5 w-40 bg-surface-bright rounded-lg" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="p-4 rounded-2xl border border-border bg-surface space-y-4">
              <div className="flex justify-between items-center">
                <div className="h-3 w-16 bg-surface-bright rounded" />
                <div className="h-3 w-12 bg-surface-bright rounded" />
              </div>
              <div className="space-y-2">
                <div className="h-4 w-3/4 bg-surface-bright rounded" />
                <div className="h-3 w-full bg-surface-bright rounded" />
              </div>
              <div className="pt-3 border-t border-border flex justify-between items-center">
                <div className="h-4 w-20 bg-surface-bright rounded" />
                <div className="h-8 w-20 bg-surface-bright rounded-xl" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
