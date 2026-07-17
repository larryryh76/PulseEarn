/**
 * SearchFilter Components
 * 
 * Search bar and filter components for the Marketplace.
 */

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search,
  X,
  SlidersHorizontal,
  ChevronDown,
  Check,
} from 'lucide-react';
import { DiscoveryFilters, OpportunityCategory, OpportunityDifficulty, MARKETPLACE_CATEGORIES } from '../../types/marketplace';
import { cn } from '../../utils';

// ─── Search Bar ───────────────────────────────────────────────────────────────

interface SearchBarProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}

export const SearchBar: React.FC<SearchBarProps> = ({
  value,
  onChange,
  placeholder = 'Search opportunities...',
  className,
}) => {
  const [isFocused, setIsFocused] = useState(false);

  return (
    <div className={cn('relative', className)}>
      <div
        className={cn(
          'flex items-center gap-3 px-4 py-3 rounded-xl border bg-surface transition-all',
          isFocused
            ? 'border-primary ring-2 ring-primary/20'
            : 'border-border hover:border-primary/40'
        )}
      >
        <Search size={18} className="text-text-tertiary shrink-0" />
        <input
          type="text"
          value={value}
          onChange={e => onChange(e.target.value)}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          placeholder={placeholder}
          className="flex-1 bg-transparent text-sm text-text-primary placeholder:text-text-tertiary outline-none"
        />
        {value && (
          <button
            onClick={() => onChange('')}
            className="p-1 rounded-full hover:bg-surface-bright transition-colors"
          >
            <X size={14} className="text-text-tertiary" />
          </button>
        )}
      </div>
    </div>
  );
};

// ─── Filter Panel ─────────────────────────────────────────────────────────────

interface FilterPanelProps {
  filters: DiscoveryFilters;
  onFiltersChange: (filters: DiscoveryFilters) => void;
  onClear: () => void;
  className?: string;
}

export const FilterPanel: React.FC<FilterPanelProps> = ({
  filters,
  onFiltersChange,
  onClear,
  className,
}) => {
  const [isOpen, setIsOpen] = useState(false);

  const hasActiveFilters = Object.keys(filters).some(key => {
    const value = filters[key as keyof DiscoveryFilters];
    return value !== undefined && (Array.isArray(value) ? value.length > 0 : true);
  });

  return (
    <div className={cn('relative', className)}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          'flex items-center gap-2 px-4 py-2.5 rounded-xl border text-sm font-medium transition-all',
          hasActiveFilters
            ? 'bg-primary/10 border-primary/30 text-primary'
            : 'bg-surface border-border text-text-secondary hover:border-primary/40'
        )}
      >
        <SlidersHorizontal size={16} />
        <span>Filters</span>
        {hasActiveFilters && (
          <span className="flex items-center justify-center w-5 h-5 rounded-full bg-primary text-white text-[10px] font-bold">
            {countActiveFilters(filters)}
          </span>
        )}
        <ChevronDown
          size={14}
          className={cn('transition-transform', isOpen && 'rotate-180')}
        />
      </button>

      <AnimatePresence>
        {isOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-40"
              onClick={() => setIsOpen(false)}
            />

            {/* Panel */}
            <motion.div
              initial={{ opacity: 0, y: -10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -10, scale: 0.95 }}
              transition={{ duration: 0.15 }}
              className="absolute top-full left-0 mt-2 w-80 p-4 rounded-xl border border-border bg-surface shadow-xl z-50"
            >
              <div className="space-y-4">
                {/* Categories */}
                <FilterSection title="Category">
                  <div className="flex flex-wrap gap-2">
                    {MARKETPLACE_CATEGORIES.map(cat => (
                      <FilterChip
                        key={cat.id}
                        label={cat.label}
                        isActive={filters.categories?.includes(cat.id)}
                        onClick={() => toggleCategory(filters, onFiltersChange, cat.id)}
                      />
                    ))}
                  </div>
                </FilterSection>

                {/* Difficulty */}
                <FilterSection title="Difficulty">
                  <div className="flex flex-wrap gap-2">
                    {(['easy', 'medium', 'hard', 'elite'] as const).map(diff => (
                      <FilterChip
                        key={diff}
                        label={diff.charAt(0).toUpperCase() + diff.slice(1)}
                        isActive={filters.difficulty?.includes(diff)}
                        onClick={() => toggleDifficulty(filters, onFiltersChange, diff)}
                      />
                    ))}
                  </div>
                </FilterSection>

                {/* Source */}
                <FilterSection title="Source">
                  <div className="flex flex-wrap gap-2">
                    <FilterChip
                      label="Internal"
                      isActive={filters.sources?.includes('internal')}
                      onClick={() => toggleSource(filters, onFiltersChange, 'internal')}
                    />
                    <FilterChip
                      label="External"
                      isActive={filters.sources?.includes('provider')}
                      onClick={() => toggleSource(filters, onFiltersChange, 'provider')}
                    />
                  </div>
                </FilterSection>

                {/* Reward Range */}
                <FilterSection title="Minimum Reward">
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      value={filters.minReward || ''}
                      onChange={e =>
                        onFiltersChange({
                          ...filters,
                          minReward: e.target.value ? parseInt(e.target.value) : undefined,
                        })
                      }
                      placeholder="0"
                      className="w-24 px-3 py-2 rounded-lg border border-border bg-surface-bright text-sm text-text-primary outline-none focus:border-primary"
                    />
                    <span className="text-text-tertiary text-sm">PTS</span>
                  </div>
                </FilterSection>

                {/* Actions */}
                <div className="flex items-center justify-between pt-2 border-t border-white/5">
                  <button
                    onClick={() => {
                      onClear();
                      setIsOpen(false);
                    }}
                    className="text-xs font-medium text-text-tertiary hover:text-text-primary transition-colors"
                  >
                    Clear All
                  </button>
                  <button
                    onClick={() => setIsOpen(false)}
                    className="px-4 py-2 rounded-lg bg-primary text-white text-xs font-bold uppercase tracking-wider hover:bg-primary-bright transition-colors"
                  >
                    Apply
                  </button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
};

// ─── Filter Section ────────────────────────────────────────────────────────────

interface FilterSectionProps {
  title: string;
  children: React.ReactNode;
}

const FilterSection: React.FC<FilterSectionProps> = ({ title, children }) => (
  <div className="space-y-2">
    <h4 className="text-[10px] font-bold uppercase tracking-widest text-text-tertiary">
      {title}
    </h4>
    {children}
  </div>
);

// ─── Filter Chip ──────────────────────────────────────────────────────────────

interface FilterChipProps {
  label: string;
  isActive?: boolean;
  onClick: () => void;
}

const FilterChip: React.FC<FilterChipProps> = ({ label, isActive, onClick }) => (
  <button
    onClick={onClick}
    className={cn(
      'px-3 py-1.5 rounded-lg text-[10px] font-medium transition-all',
      isActive
        ? 'bg-primary text-white'
        : 'bg-surface-bright border border-border text-text-secondary hover:border-primary/40'
    )}
  >
    {isActive && <Check size={10} className="inline mr-1" />}
    {label}
  </button>
);

// ─── Sort Dropdown ────────────────────────────────────────────────────────────

interface SortDropdownProps {
  value: string;
  onChange: (value: string) => void;
  options: { value: string; label: string }[];
  className?: string;
}

export const SortDropdown: React.FC<SortDropdownProps> = ({
  value,
  onChange,
  options,
  className,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const selected = options.find(o => o.value === value);

  return (
    <div className={cn('relative', className)}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-border bg-surface text-sm text-text-secondary hover:border-primary/40 transition-all"
      >
        <span>Sort: {selected?.label}</span>
        <ChevronDown
          size={14}
          className={cn('transition-transform', isOpen && 'rotate-180')}
        />
      </button>

      <AnimatePresence>
        {isOpen && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
            <motion.div
              initial={{ opacity: 0, y: -5 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -5 }}
              className="absolute top-full left-0 mt-1 w-48 py-1 rounded-lg border border-border bg-surface shadow-lg z-50"
            >
              {options.map(option => (
                <button
                  key={option.value}
                  onClick={() => {
                    onChange(option.value);
                    setIsOpen(false);
                  }}
                  className={cn(
                    'w-full px-3 py-2 text-left text-sm transition-colors',
                    value === option.value
                      ? 'bg-primary/10 text-primary'
                      : 'text-text-secondary hover:bg-surface-bright'
                  )}
                >
                  {option.label}
                </button>
              ))}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
};

// ─── Active Filter Tags ────────────────────────────────────────────────────────

interface ActiveFilterTagsProps {
  filters: DiscoveryFilters;
  onRemove: (key: string, value?: string) => void;
  className?: string;
}

export const ActiveFilterTags: React.FC<ActiveFilterTagsProps> = ({
  filters,
  onRemove,
  className,
}) => {
  const tags: { key: string; label: string }[] = [];

  if (filters.categories) {
    filters.categories.forEach(cat => {
      const config = MARKETPLACE_CATEGORIES.find(c => c.id === cat);
      if (config) {
        tags.push({ key: `categories:${cat}`, label: config.label });
      }
    });
  }

  if (filters.difficulty) {
    filters.difficulty.forEach(diff => {
      tags.push({
        key: `difficulty:${diff}`,
        label: diff.charAt(0).toUpperCase() + diff.slice(1),
      });
    });
  }

  if (filters.minReward) {
    tags.push({
      key: 'minReward',
      label: `${filters.minReward}+ PTS`,
    });
  }

  if (tags.length === 0) return null;

  return (
    <div className={cn('flex flex-wrap gap-2', className)}>
      {tags.map(tag => (
        <motion.div
          key={tag.key}
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.9 }}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-primary/10 border border-primary/20 text-primary text-[10px] font-medium"
        >
          <span>{tag.label}</span>
          <button
            onClick={() => {
              const [key, val] = tag.key.split(':');
              onRemove(key, val);
            }}
            className="hover:bg-primary/20 rounded-full p-0.5 transition-colors"
          >
            <X size={10} />
          </button>
        </motion.div>
      ))}
    </div>
  );
};

// ─── Utilities ────────────────────────────────────────────────────────────────

function countActiveFilters(filters: DiscoveryFilters): number {
  let count = 0;
  if (filters.categories?.length) count += filters.categories.length;
  if (filters.difficulty?.length) count += filters.difficulty.length;
  if (filters.sources?.length) count += filters.sources.length;
  if (filters.minReward) count += 1;
  return count;
}

function toggleCategory(
  filters: DiscoveryFilters,
  onChange: (f: DiscoveryFilters) => void,
  category: OpportunityCategory
) {
  const current = filters.categories || [];
  const updated = current.includes(category)
    ? current.filter(c => c !== category)
    : [...current, category];
  onChange({ ...filters, categories: updated.length ? updated : undefined });
}

function toggleDifficulty(
  filters: DiscoveryFilters,
  onChange: (f: DiscoveryFilters) => void,
  difficulty: OpportunityDifficulty
) {
  const current = filters.difficulty || [];
  const updated = current.includes(difficulty)
    ? current.filter(d => d !== difficulty)
    : [...current, difficulty];
  onChange({ ...filters, difficulty: updated.length ? updated : undefined });
}

function toggleSource(
  filters: DiscoveryFilters,
  onChange: (f: DiscoveryFilters) => void,
  source: 'internal' | 'provider'
) {
  const current = filters.sources || [];
  const updated = current.includes(source)
    ? current.filter(s => s !== source)
    : [...current, source];
  onChange({ ...filters, sources: updated.length ? updated : undefined });
}

export default {
  SearchBar,
  FilterPanel,
  SortDropdown,
  ActiveFilterTags,
};
