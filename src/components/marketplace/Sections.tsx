/**
 * Section Components
 * 
 * Displays recommendation sections with various layouts:
 * - Hero: Large featured cards
 * - Featured: Medium featured cards
 * - Slider: Horizontally scrollable
 * - Grid: Standard card grid
 * - Row: Compact horizontal list
 */

import React, { useRef } from 'react';
import { motion } from 'framer-motion';
import { ChevronRight, ChevronLeft, Sparkles } from 'lucide-react';
import { RecommendationSection, MarketplaceOpportunity } from '../../types/marketplace';
import { OpportunityCard } from './OpportunityCard';
import { cn } from '../../utils';

// ─── Section Wrapper ──────────────────────────────────────────────────────────

interface SectionProps {
  section: RecommendationSection;
  onOpenOpportunity: (opportunity: MarketplaceOpportunity) => void;
  showViewAll?: boolean;
  className?: string;
}

export const Section: React.FC<SectionProps> = ({
  section,
  onOpenOpportunity,
  showViewAll = true,
  className,
}) => {
  if (section.opportunities.length === 0) return null;

  return (
    <motion.section
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] as const }}
      className={cn('space-y-4', className)}
    >
      {/* Section Header */}
      <div className="flex items-end justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            {section.source === 'featured' && (
              <Sparkles size={16} className="text-primary" />
            )}
            <h2 className="text-lg font-bold text-text-primary">
              {section.title}
            </h2>
          </div>
          {section.subtitle && (
            <p className="text-xs text-text-tertiary">{section.subtitle}</p>
          )}
        </div>

        {showViewAll && section.viewAllUrl && (
          <a
            href={section.viewAllUrl}
            className="text-[10px] font-bold text-primary hover:text-primary-bright uppercase tracking-wider transition-colors flex items-center gap-1"
          >
            View All <ChevronRight size={12} />
          </a>
        )}
      </div>

      {/* Section Content */}
      <SectionContent
        layout={section.layout}
        opportunities={section.opportunities}
        onOpen={onOpenOpportunity}
        showProviderBadge={section.showProviderBadge}
      />
    </motion.section>
  );
};

// ─── Section Content ──────────────────────────────────────────────────────────

interface SectionContentProps {
  layout: 'hero' | 'featured' | 'grid' | 'slider' | 'row' | 'list';
  opportunities: MarketplaceOpportunity[];
  onOpen: (opportunity: MarketplaceOpportunity) => void;
  showProviderBadge?: boolean;
}

const SectionContent: React.FC<SectionContentProps> = ({
  layout,
  opportunities,
  onOpen,
  showProviderBadge,
}) => {
  switch (layout) {
    case 'hero':
      return <HeroLayout opportunities={opportunities} onOpen={onOpen} />;
    case 'featured':
      return (
        <FeaturedLayout
          opportunities={opportunities}
          onOpen={onOpen}
          showProviderBadge={showProviderBadge}
        />
      );
    case 'slider':
      return (
        <SliderLayout
          opportunities={opportunities}
          onOpen={onOpen}
          showProviderBadge={showProviderBadge}
        />
      );
    case 'row':
      return (
        <RowLayout
          opportunities={opportunities}
          onOpen={onOpen}
          showProviderBadge={showProviderBadge}
        />
      );
    case 'list':
      return (
        <CompactLayout
          opportunities={opportunities}
          onOpen={onOpen}
          showProviderBadge={showProviderBadge}
        />
      );
    default:
      return (
        <GridLayout
          opportunities={opportunities}
          onOpen={onOpen}
          showProviderBadge={showProviderBadge}
        />
      );
  }
};

// ─── Hero Layout ─────────────────────────────────────────────────────────────

const HeroLayout: React.FC<{
  opportunities: MarketplaceOpportunity[];
  onOpen: (opp: MarketplaceOpportunity) => void;
}> = ({ opportunities, onOpen }) => {
  const [primary, ...secondary] = opportunities;
  
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      {/* Primary - Large */}
      {primary && (
        <div className="lg:row-span-2">
          <OpportunityCard
            opportunity={primary}
            variant="featured"
            onOpen={onOpen}
            className="h-full min-h-[280px]"
          />
        </div>
      )}

      {/* Secondary */}
      {secondary.slice(0, 2).map(opp => (
        <OpportunityCard
          key={opp.id}
          opportunity={opp}
          variant="featured"
          onOpen={onOpen}
          className="h-[136px]"
        />
      ))}
    </div>
  );
};

// ─── Featured Layout ──────────────────────────────────────────────────────────

const FeaturedLayout: React.FC<{
  opportunities: MarketplaceOpportunity[];
  onOpen: (opp: MarketplaceOpportunity) => void;
  showProviderBadge?: boolean;
}> = ({ opportunities, onOpen, showProviderBadge }) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {opportunities.slice(0, 4).map(opp => (
        <OpportunityCard
          key={opp.id}
          opportunity={opp}
          variant="featured"
          onOpen={onOpen}
          showProviderBadge={showProviderBadge}
        />
      ))}
    </div>
  );
};

// ─── Slider Layout ────────────────────────────────────────────────────────────

const SliderLayout: React.FC<{
  opportunities: MarketplaceOpportunity[];
  onOpen: (opp: MarketplaceOpportunity) => void;
  showProviderBadge?: boolean;
}> = ({ opportunities, onOpen, showProviderBadge }) => {
  const scrollRef = useRef<HTMLDivElement>(null);

  const scroll = (direction: 'left' | 'right') => {
    if (scrollRef.current) {
      const scrollAmount = 300;
      scrollRef.current.scrollBy({
        left: direction === 'left' ? -scrollAmount : scrollAmount,
        behavior: 'smooth',
      });
    }
  };

  return (
    <div className="relative group/slider">
      {/* Navigation Arrows */}
      <button
        onClick={() => scroll('left')}
        className="absolute left-0 top-1/2 -translate-y-1/2 z-10 p-2 rounded-full bg-surface-bright/80 backdrop-blur-sm border border-border text-text-primary opacity-0 group-hover/slider:opacity-100 transition-all hover:bg-primary hover:text-white hover:border-primary -translate-x-2 group-hover/slider:translate-x-0"
        aria-label="Scroll left"
      >
        <ChevronLeft size={20} />
      </button>
      <button
        onClick={() => scroll('right')}
        className="absolute right-0 top-1/2 -translate-y-1/2 z-10 p-2 rounded-full bg-surface-bright/80 backdrop-blur-sm border border-border text-text-primary opacity-0 group-hover/slider:opacity-100 transition-all hover:bg-primary hover:text-white hover:border-primary translate-x-2 group-hover/slider:translate-x-0"
        aria-label="Scroll right"
      >
        <ChevronRight size={20} />
      </button>

      {/* Scrollable Container */}
      <div
        ref={scrollRef}
        className="flex gap-4 overflow-x-auto pb-4 scrollbar-hide snap-x snap-mandatory"
        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
      >
        {opportunities.map(opp => (
          <motion.div
            key={opp.id}
            className="shrink-0 w-[280px] snap-start"
            layout
          >
            <OpportunityCard
              opportunity={opp}
              variant="default"
              onOpen={onOpen}
              showProviderBadge={showProviderBadge}
            />
          </motion.div>
        ))}
      </div>
    </div>
  );
};

// ─── Row Layout ──────────────────────────────────────────────────────────────

const RowLayout: React.FC<{
  opportunities: MarketplaceOpportunity[];
  onOpen: (opp: MarketplaceOpportunity) => void;
  showProviderBadge?: boolean;
}> = ({ opportunities, onOpen, showProviderBadge }) => {
  return (
    <div className="space-y-3">
      {opportunities.map(opp => (
        <OpportunityCard
          key={opp.id}
          opportunity={opp}
          variant="row"
          onOpen={onOpen}
          showProviderBadge={showProviderBadge}
        />
      ))}
    </div>
  );
};

// ─── Compact Layout ──────────────────────────────────────────────────────────

const CompactLayout: React.FC<{
  opportunities: MarketplaceOpportunity[];
  onOpen: (opp: MarketplaceOpportunity) => void;
  showProviderBadge?: boolean;
}> = ({ opportunities, onOpen, showProviderBadge }) => {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
      {opportunities.map(opp => (
        <OpportunityCard
          key={opp.id}
          opportunity={opp}
          variant="compact"
          onOpen={onOpen}
          showProviderBadge={showProviderBadge}
        />
      ))}
    </div>
  );
};

// ─── Grid Layout ─────────────────────────────────────────────────────────────

const GridLayout: React.FC<{
  opportunities: MarketplaceOpportunity[];
  onOpen: (opp: MarketplaceOpportunity) => void;
  showProviderBadge?: boolean;
}> = ({ opportunities, onOpen, showProviderBadge }) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {opportunities.map(opp => (
        <OpportunityCard
          key={opp.id}
          opportunity={opp}
          variant="default"
          onOpen={onOpen}
          showProviderBadge={showProviderBadge}
        />
      ))}
    </div>
  );
};

// ─── Category Tabs ─────────────────────────────────────────────────────────────

interface CategoryTabsProps {
  categories: { id: string; label: string }[];
  activeCategory: string;
  onCategoryChange: (category: string) => void;
  className?: string;
}

export const CategoryTabs: React.FC<CategoryTabsProps> = ({
  categories,
  activeCategory,
  onCategoryChange,
  className,
}) => {
  return (
    <div className={cn('flex items-center gap-2 overflow-x-auto pb-2 scrollbar-hide', className)}>
      {categories.map(cat => (
        <button
          key={cat.id}
          onClick={() => onCategoryChange(cat.id)}
          className={cn(
            'px-4 py-2 rounded-full text-[10px] font-bold uppercase tracking-wider whitespace-nowrap transition-all',
            activeCategory === cat.id
              ? 'bg-primary text-white shadow-lg shadow-primary/20'
              : 'bg-surface border border-border text-text-secondary hover:border-primary/40 hover:text-text-primary'
          )}
        >
          {cat.label}
        </button>
      ))}
    </div>
  );
};

// ─── View Mode Toggle ─────────────────────────────────────────────────────────

interface ViewModeToggleProps {
  viewMode: 'sections' | 'grid' | 'list';
  onViewModeChange: (mode: 'sections' | 'grid' | 'list') => void;
  className?: string;
}

export const ViewModeToggle: React.FC<ViewModeToggleProps> = ({
  viewMode,
  onViewModeChange,
  className,
}) => {
  const modes = [
    { id: 'sections' as const, label: 'For You' },
    { id: 'grid' as const, label: 'Grid' },
    { id: 'list' as const, label: 'List' },
  ];

  return (
    <div className={cn('flex items-center gap-1 p-1 rounded-xl bg-surface border border-border', className)}>
      {modes.map(mode => (
        <button
          key={mode.id}
          onClick={() => onViewModeChange(mode.id)}
          className={cn(
            'px-3 py-1.5 rounded-lg text-[9px] font-bold uppercase tracking-wider transition-all',
            viewMode === mode.id
              ? 'bg-primary text-white'
              : 'text-text-tertiary hover:text-text-primary'
          )}
        >
          {mode.label}
        </button>
      ))}
    </div>
  );
};

export default Section;
