import React from 'react';
import { OpportunityCategory, MARKETPLACE_CATEGORIES } from '../../types/marketplace';
import { cn } from '../../utils';

interface MarketplaceCategoriesProps {
  activeCategoriesInInventory: OpportunityCategory[];
  selectedCategory: OpportunityCategory | 'all';
  onSelectCategory: (cat: OpportunityCategory | 'all') => void;
}

export const MarketplaceCategories: React.FC<MarketplaceCategoriesProps> = ({
  activeCategoriesInInventory,
  selectedCategory,
  onSelectCategory,
}) => {
  // Only show categories that are supported by the active normalized dataset
  const availableCategories = MARKETPLACE_CATEGORIES.filter((cat) =>
    activeCategoriesInInventory.includes(cat.id)
  );

  return (
    <nav className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar" aria-label="Opportunity Categories">
      <button
        onClick={() => onSelectCategory('all')}
        className={cn(
          'px-3.5 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all border min-h-[36px]',
          selectedCategory === 'all'
            ? 'bg-primary text-white border-primary shadow-xs'
            : 'bg-surface border-border text-text-secondary hover:border-border-bright hover:text-text-primary'
        )}
      >
        All
      </button>

      {availableCategories.map((cat) => {
        const isSelected = selectedCategory === cat.id;
        return (
          <button
            key={cat.id}
            onClick={() => onSelectCategory(cat.id)}
            className={cn(
              'px-3.5 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all border min-h-[36px]',
              isSelected
                ? 'bg-primary text-white border-primary shadow-xs'
                : 'bg-surface border-border text-text-secondary hover:border-border-bright hover:text-text-primary'
            )}
          >
            {cat.label}
          </button>
        );
      })}
    </nav>
  );
};
