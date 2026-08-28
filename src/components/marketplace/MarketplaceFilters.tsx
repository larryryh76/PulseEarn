import React from 'react';
import { Search, X } from 'lucide-react';
import { OpportunityDifficulty } from '../../types/marketplace';
import { cn } from '../../utils';

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
  searchQuery: string;
  onSearchChange: (query: string) => void;
  selectedDifficulty: OpportunityDifficulty | 'all';
  onDifficultyChange: (difficulty: OpportunityDifficulty | 'all') => void;
  selectedSecondaryFilter: SecondaryFilter;
  onSecondaryFilterChange: (filter: SecondaryFilter) => void;
  sortBy: 'recommended' | 'reward' | 'time' | 'difficulty' | 'newest';
  onSortByChange: (sort: 'recommended' | 'reward' | 'time' | 'difficulty' | 'newest') => void;
  hasActiveFilters: boolean;
  onResetFilters: () => void;
}

const SECONDARY_FILTERS: { id: SecondaryFilter; label: string }[] = [
  { id: 'all', label: 'All Opportunities' },
  { id: 'highest_reward', label: '💎 High Value' },
  { id: 'quick_earn', label: '⚡ Quick (≤5m)' },
  { id: 'new', label: '✨ New' },
  { id: 'mobile', label: '📱 Mobile' },
  { id: 'desktop', label: '💻 Desktop' },
  { id: 'available_now', label: '🟢 Available Now' },
  { id: 'ending_soon', label: '⏳ Ending Soon' },
];

export const MarketplaceFilters: React.FC<MarketplaceFiltersProps> = ({
  searchQuery,
  onSearchChange,
  selectedDifficulty,
  onDifficultyChange,
  selectedSecondaryFilter,
  onSecondaryFilterChange,
  sortBy,
  onSortByChange,
  hasActiveFilters,
  onResetFilters,
}) => {
  return (
    <div className="space-y-3">
      {/* Primary Search & Controls Toolbar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-surface p-3 rounded-2xl border border-border shadow-xs">
        {/* Search Bar */}
        <div className="relative flex-1">
          <Search
            size={16}
            className="absolute left-3.5 top-1/2 -translate-y-1/2 text-text-tertiary pointer-events-none"
          />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search opportunities by title, category, provider, or tags..."
            className="w-full bg-surface-bright/70 border border-border rounded-xl pl-9 pr-9 py-2 text-xs md:text-sm text-text-primary focus:outline-none focus:border-primary transition-all placeholder:text-text-tertiary min-h-[44px]"
          />
          {searchQuery && (
            <button
              onClick={() => onSearchChange('')}
              aria-label="Clear search input"
              className="absolute right-3 top-1/2 -translate-y-1/2 text-text-tertiary hover:text-text-primary p-1 rounded-md transition-colors"
            >
              <X size={14} />
            </button>
          )}
        </div>

        {/* Dropdowns for Sort & Difficulty */}
        <div className="flex items-center gap-2 shrink-0">
          <div className="relative">
            <select
              value={selectedDifficulty}
              onChange={(e) => onDifficultyChange(e.target.value as OpportunityDifficulty | 'all')}
              aria-label="Filter by Difficulty"
              className="bg-surface-bright border border-border rounded-xl px-3 py-2 text-xs font-semibold text-text-secondary focus:outline-none focus:border-primary transition-all min-h-[44px] cursor-pointer"
            >
              <option value="all">All Difficulties</option>
              <option value="easy">Easy</option>
              <option value="medium">Medium</option>
              <option value="hard">Hard</option>
              <option value="elite">Elite</option>
            </select>
          </div>

          <div className="relative">
            <select
              value={sortBy}
              onChange={(e) =>
                onSortByChange(
                  e.target.value as 'recommended' | 'reward' | 'time' | 'difficulty' | 'newest'
                )
              }
              aria-label="Sort opportunities"
              className="bg-surface-bright border border-border rounded-xl px-3 py-2 text-xs font-semibold text-text-secondary focus:outline-none focus:border-primary transition-all min-h-[44px] cursor-pointer"
            >
              <option value="recommended">Best Match</option>
              <option value="reward">Highest Reward</option>
              <option value="time">Fastest Completion</option>
              <option value="difficulty">Difficulty</option>
              <option value="newest">Newest Added</option>
            </select>
          </div>

          {hasActiveFilters && (
            <button
              onClick={onResetFilters}
              className="px-3 py-2 text-xs font-bold text-danger hover:bg-danger/10 rounded-xl transition-all shrink-0 min-h-[44px]"
            >
              Reset
            </button>
          )}
        </div>
      </div>

      {/* Secondary Quick Filter Pills */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar text-xs">
        <span className="text-[10px] font-bold uppercase tracking-wider text-text-tertiary mr-1 font-mono shrink-0">
          Quick Filter:
        </span>
        {SECONDARY_FILTERS.map((f) => {
          const isSelected = selectedSecondaryFilter === f.id;
          return (
            <button
              key={f.id}
              onClick={() => onSecondaryFilterChange(f.id)}
              className={cn(
                'px-2.5 py-1 rounded-lg text-[11px] font-medium whitespace-nowrap transition-all border shrink-0',
                isSelected
                  ? 'bg-primary/10 border-primary text-primary font-bold shadow-xs'
                  : 'bg-surface/80 border-border text-text-tertiary hover:text-text-secondary hover:bg-surface-bright'
              )}
            >
              {f.label}
            </button>
          );
        })}
      </div>
    </div>
  );
};
