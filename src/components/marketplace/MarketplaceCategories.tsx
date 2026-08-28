import React from 'react';
import {
  Sparkles,
  BarChart3,
  Tag,
  Smartphone,
  Gamepad2,
  Share2,
  Target,
  Layers,
  ShoppingBag,
  CreditCard,
  Play,
  GraduationCap,
  Users,
  UserPlus,
  TrendingUp,
  Gift,
  Star,
  Clock,
  Flame,
  LayoutGrid,
} from 'lucide-react';
import { OpportunityCategory, MARKETPLACE_CATEGORIES } from '../../types/marketplace';
import { cn } from '../../utils';

interface MarketplaceCategoriesProps {
  selectedCategory: OpportunityCategory | 'all';
  onSelectCategory: (category: OpportunityCategory | 'all') => void;
  categoryCounts?: Record<string, number>;
  totalCount?: number;
}

const CATEGORY_ICONS: Record<string, React.FC<{ size?: number; className?: string }>> = {
  featured: Sparkles,
  surveys: BarChart3,
  offers: Tag,
  apps: Smartphone,
  games: Gamepad2,
  social: Share2,
  missions: Target,
  campaigns: Layers,
  shopping: ShoppingBag,
  cashback: CreditCard,
  videos: Play,
  learn: GraduationCap,
  community: Users,
  referrals: UserPlus,
  predictions: TrendingUp,
  seasonal: Gift,
  sponsored: Star,
  limited: Clock,
  daily: Flame,
};

export const MarketplaceCategories: React.FC<MarketplaceCategoriesProps> = ({
  selectedCategory,
  onSelectCategory,
  categoryCounts = {},
  totalCount = 0,
}) => {
  // Key categories to showcase in the top primary strip
  const displayCategories = [
    { id: 'all' as const, label: 'All', icon: LayoutGrid },
    ...MARKETPLACE_CATEGORIES.map(cat => ({
      id: cat.id,
      label: cat.label,
      icon: CATEGORY_ICONS[cat.id] || Tag,
    })),
  ];

  return (
    <div className="relative">
      <div className="flex items-center gap-2 overflow-x-auto pb-1.5 pt-0.5 no-scrollbar scroll-smooth">
        {displayCategories.map(cat => {
          const isSelected = selectedCategory === cat.id;
          const Icon = cat.icon;
          const count = cat.id === 'all' ? totalCount : categoryCounts[cat.id];

          return (
            <button
              key={cat.id}
              onClick={() => onSelectCategory(cat.id)}
              className={cn(
                'group flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all border shrink-0 min-h-[40px] focus:outline-none focus:ring-2 focus:ring-primary/50',
                isSelected
                  ? 'bg-primary text-white border-primary shadow-sm shadow-primary/20 scale-[1.02]'
                  : 'bg-surface border-border text-text-secondary hover:border-border-bright hover:text-text-primary hover:bg-surface-bright/80'
              )}
            >
              <Icon
                size={14}
                className={cn(
                  'transition-transform group-hover:scale-110 shrink-0',
                  isSelected ? 'text-white' : 'text-primary'
                )}
              />
              <span>{cat.label}</span>
              {typeof count === 'number' && count > 0 && (
                <span
                  className={cn(
                    'text-[10px] px-1.5 py-0.2 rounded-md font-mono font-medium',
                    isSelected
                      ? 'bg-white/20 text-white'
                      : 'bg-surface-bright border border-border text-text-tertiary group-hover:text-text-secondary'
                  )}
                >
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
};
