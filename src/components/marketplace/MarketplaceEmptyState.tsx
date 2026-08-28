import React from 'react';
import { SearchX, RefreshCw, SlidersHorizontal } from 'lucide-react';

interface MarketplaceEmptyStateProps {
  title?: string;
  description?: string;
  onReset?: () => void;
  onRefresh?: () => void;
  isLoading?: boolean;
}

export const MarketplaceEmptyState: React.FC<MarketplaceEmptyStateProps> = ({
  title = 'No matching opportunities found',
  description = 'Try adjusting your search keywords, switching categories, or resetting active filters to discover more tasks.',
  onReset,
  onRefresh,
  isLoading = false,
}) => {
  return (
    <div className="p-8 md:p-12 rounded-2xl border border-border bg-surface text-center space-y-4 shadow-xs">
      <div className="w-12 h-12 rounded-2xl bg-surface-bright border border-border flex items-center justify-center text-text-tertiary mx-auto">
        <SearchX size={22} />
      </div>

      <div className="space-y-1.5 max-w-md mx-auto">
        <h3 className="text-sm md:text-base font-bold text-text-primary">{title}</h3>
        <p className="text-xs text-text-tertiary leading-relaxed">{description}</p>
      </div>

      <div className="pt-2 flex flex-wrap items-center justify-center gap-2.5">
        {onReset && (
          <button
            onClick={onReset}
            className="px-4 py-2 rounded-xl bg-primary text-white text-xs font-bold hover:bg-primary-hover transition-all min-h-[44px] shadow-xs active:scale-95 flex items-center gap-1.5"
          >
            <SlidersHorizontal size={13} />
            <span>Reset Filters</span>
          </button>
        )}

        {onRefresh && (
          <button
            onClick={onRefresh}
            disabled={isLoading}
            className="px-4 py-2 rounded-xl bg-surface-bright border border-border text-xs font-bold text-text-secondary hover:text-text-primary transition-all min-h-[44px] shadow-xs active:scale-95 flex items-center gap-1.5 disabled:opacity-50"
          >
            <RefreshCw size={13} className={isLoading ? 'animate-spin text-primary' : ''} />
            <span>Refresh Inventory</span>
          </button>
        )}
      </div>
    </div>
  );
};
