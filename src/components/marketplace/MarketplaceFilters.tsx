import React from 'react';
import { OpportunityDifficulty } from '../../types/marketplace';

export type SecondaryFilter =
  | 'all'
  | 'highest_reward'
  | 'quick_earn'
  | 'new'
  | 'mobile'
  | 'desktop'
  | 'available_now'
  | 'ending_soon';

interface MarketplaceFiltersProps {
  selectedDifficulty: OpportunityDifficulty | 'all';
  onSelectDifficulty: (difficulty: OpportunityDifficulty | 'all') => void;
  selectedSecondaryFilter: SecondaryFilter;
  onSelectSecondaryFilter: (filter: SecondaryFilter) => void;
  selectedProvider: string;
  onSelectProvider: (providerId: string) => void;
  availableProviders: { id: string; name: string }[];
  sortBy: 'recommended' | 'reward' | 'time' | 'difficulty' | 'newest';
  onSelectSortBy: (sort: 'recommended' | 'reward' | 'time' | 'difficulty' | 'newest') => void;
  hasActiveFilters: boolean;
  onResetFilters: () => void;
}

export const MarketplaceFilters: React.FC<MarketplaceFiltersProps> = ({
  selectedDifficulty,
  onSelectDifficulty,
  selectedSecondaryFilter,
  onSelectSecondaryFilter,
  selectedProvider,
  onSelectProvider,
  availableProviders,
  sortBy,
  onSelectSortBy,
  hasActiveFilters,
  onResetFilters,
}) => {
  return (
    <div className="space-y-2">
      {/* Controls Bar */}
      <div className="flex flex-wrap items-center justify-between gap-2.5 bg-surface p-3 rounded-2xl border border-border shadow-xs">
        <div className="flex flex-wrap items-center gap-2">
          {/* Difficulty Dropdown */}
          <select
            value={selectedDifficulty}
            onChange={(e) => onSelectDifficulty(e.target.value as OpportunityDifficulty | 'all')}
            aria-label="Filter by Difficulty"
            className="bg-surface-bright border border-border rounded-xl px-3 py-1.5 text-xs font-medium text-text-secondary focus:outline-none focus:border-primary transition-colors min-h-[36px]"
          >
            <option value="all">All Difficulties</option>
            <option value="easy">Easy</option>
            <option value="medium">Medium</option>
            <option value="hard">Hard</option>
            <option value="elite">Elite</option>
          </select>

          {/* Provider Dropdown (if available) */}
          {availableProviders.length > 0 && (
            <select
              value={selectedProvider}
              onChange={(e) => onSelectProvider(e.target.value)}
              aria-label="Filter by Provider"
              className="bg-surface-bright border border-border rounded-xl px-3 py-1.5 text-xs font-medium text-text-secondary focus:outline-none focus:border-primary transition-colors min-h-[36px]"
            >
              <option value="all">All Providers</option>
              {availableProviders.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          )}

          {/* Sort Dropdown */}
          <select
            value={sortBy}
            onChange={(e) =>
              onSelectSortBy(e.target.value as 'recommended' | 'reward' | 'time' | 'difficulty' | 'newest')
            }
            aria-label="Sort opportunities"
            className="bg-surface-bright border border-border rounded-xl px-3 py-1.5 text-xs font-medium text-text-secondary focus:outline-none focus:border-primary transition-colors min-h-[36px]"
          >
            <option value="recommended">Best Match</option>
            <option value="reward">Highest Reward</option>
            <option value="time">Fastest Time</option>
            <option value="difficulty">Difficulty</option>
            <option value="newest">Newest</option>
          </select>
        </div>

        {hasActiveFilters && (
          <button
            onClick={onResetFilters}
            className="px-3 py-1.5 text-xs font-bold text-danger hover:underline transition-colors shrink-0"
          >
            Reset Filters
          </button>
        )}
      </div>

      {/* Secondary Quick Filters */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar text-xs">
        <span className="text-[10px] font-bold uppercase tracking-wider text-text-tertiary mr-1 font-mono">
          Quick:
        </span>
        {[
          { id: 'all', label: 'All Types' },
          { id: 'highest_reward', label: 'Highest Reward' },
          { id: 'quick_earn', label: 'Quick Earn' },
          { id: 'new', label: 'New' },
          { id: 'mobile', label: 'Mobile' },
          { id: 'desktop', label: 'Desktop' },
          { id: 'available_now', label: 'Available Now' },
          { id: 'ending_soon', label: 'Ending Soon' },
        ].map((f) => (
          <button
            key={f.id}
            onClick={() => onSelectSecondaryFilter(f.id as SecondaryFilter)}
            aria-pressed={selectedSecondaryFilter === f.id}
            className={`px-2.5 py-1 rounded-lg text-[11px] font-medium whitespace-nowrap transition-all border ${
              selectedSecondaryFilter === f.id
                ? 'bg-surface-bright border-primary text-primary font-bold shadow-xs'
                : 'bg-surface/60 border-border/80 text-text-tertiary hover:text-text-primary'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>
    </div>
  );
};
