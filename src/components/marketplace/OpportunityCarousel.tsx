/**
 * OpportunityCarousel
 * 
 * Part 1 Foundation: Premium horizontal carousels for each section.
 * Think Steam Featured, App Store Featured, Netflix rows.
 * 
 * Features:
 * - Smooth horizontal scrolling
 * - Arrow navigation
 * - Drag to scroll
 * - Touch-friendly
 * - Keyboard navigation
 */

import React, { useRef, useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { ChevronLeft, ChevronRight, Sparkles, TrendingUp, Clock, Zap } from 'lucide-react';
import { MarketplaceOpportunity, SectionSource, SectionLayout } from '../../types/marketplace';
import { OpportunityCard } from './OpportunityCard';
import { cn } from '../../utils';

// ─── Carousel Component ─────────────────────────────────────────────────────

interface OpportunityCarouselProps {
  title: string;
  subtitle?: string;
  opportunities: MarketplaceOpportunity[];
  source: SectionSource;
  layout?: SectionLayout;
  onOpportunityClick?: (opportunity: MarketplaceOpportunity) => void;
  maxItems?: number;
  className?: string;
}

export const OpportunityCarousel: React.FC<OpportunityCarouselProps> = ({
  title,
  subtitle,
  opportunities,
  source,
  layout = 'slider',
  onOpportunityClick,
  maxItems = 10,
  className,
}) => {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);
  const [isHovering, setIsHovering] = useState(false);
  
  const displayOpportunities = opportunities.slice(0, maxItems);
  
  // Check scroll state
  const checkScrollState = () => {
    const container = scrollRef.current;
    if (!container) return;
    
    setCanScrollLeft(container.scrollLeft > 10);
    setCanScrollRight(
      container.scrollLeft < container.scrollWidth - container.clientWidth - 10
    );
  };

  useEffect(() => {
    checkScrollState();
    const container = scrollRef.current;
    if (!container) return;

    container.addEventListener('scroll', checkScrollState, { passive: true });
    window.addEventListener('resize', checkScrollState, { passive: true });
    
    return () => {
      container.removeEventListener('scroll', checkScrollState);
      window.removeEventListener('resize', checkScrollState);
    };
  }, [opportunities]);

  // Scroll handlers
  const scroll = (direction: 'left' | 'right') => {
    const container = scrollRef.current;
    if (!container) return;

    const scrollAmount = container.clientWidth * 0.75;
    container.scrollBy({
      left: direction === 'left' ? -scrollAmount : scrollAmount,
      behavior: 'smooth',
    });
  };

  // Get source icon and color
  const sourceConfig = getSourceConfig(source);

  if (displayOpportunities.length === 0) {
    return null;
  }

  return (
    <div 
      className={cn('relative group', className)}
      onMouseEnter={() => setIsHovering(true)}
      onMouseLeave={() => setIsHovering(false)}
    >
      {/* Section Header */}
      <div className="flex items-end justify-between mb-4 px-4 md:px-0">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <div 
              className="w-8 h-8 rounded-lg flex items-center justify-center"
              style={{ backgroundColor: `${sourceConfig.color}20` }}
            >
              <sourceConfig.icon size={16} style={{ color: sourceConfig.color }} />
            </div>
            <h3 className="text-lg font-bold text-text-primary">
              {title}
            </h3>
          </div>
          {subtitle && (
            <p className="text-xs text-text-tertiary ml-10">
              {subtitle}
            </p>
          )}
        </div>
        
        {/* Navigation Arrows */}
        <div className="flex items-center gap-2">
          <motion.button
            initial={{ opacity: 0 }}
            animate={{ opacity: isHovering && canScrollLeft ? 1 : 0 }}
            onClick={() => scroll('left')}
            disabled={!canScrollLeft}
            className={cn(
              'w-8 h-8 rounded-lg flex items-center justify-center',
              'bg-surface border border-border',
              'transition-all duration-200',
              canScrollLeft 
                ? 'hover:bg-surface-bright hover:border-primary/30 cursor-pointer' 
                : 'opacity-30 cursor-not-allowed'
            )}
            aria-label="Scroll left"
          >
            <ChevronLeft size={16} className="text-text-secondary" />
          </motion.button>
          
          <motion.button
            initial={{ opacity: 0 }}
            animate={{ opacity: isHovering && canScrollRight ? 1 : 0 }}
            onClick={() => scroll('right')}
            disabled={!canScrollRight}
            className={cn(
              'w-8 h-8 rounded-lg flex items-center justify-center',
              'bg-surface border border-border',
              'transition-all duration-200',
              canScrollRight 
                ? 'hover:bg-surface-bright hover:border-primary/30 cursor-pointer' 
                : 'opacity-30 cursor-not-allowed'
            )}
            aria-label="Scroll right"
          >
            <ChevronRight size={16} className="text-text-secondary" />
          </motion.button>
        </div>
      </div>

      {/* Carousel Container */}
      <div className="relative">
        {/* Left Fade */}
        <div 
          className={cn(
            'absolute left-0 top-0 bottom-0 w-8 md:w-16 z-10 pointer-events-none transition-opacity duration-300',
            canScrollLeft ? 'opacity-100' : 'opacity-0'
          )}
          style={{
            background: 'linear-gradient(to right, var(--background), transparent)',
          }}
        />

        {/* Scrollable Container */}
        <div
          ref={scrollRef}
          className={cn(
            'flex gap-4 overflow-x-auto snap-x snap-mandatory',
            'scrollbar-hide pb-4',
            'px-4 md:px-0'
          )}
          style={{ scrollPaddingLeft: '1rem' }}
        >
          {displayOpportunities.map((opportunity, index) => (
            <motion.div
              key={opportunity.id}
              initial={{ opacity: 0, x: 50 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.05, duration: 0.3 }}
              className="flex-shrink-0 w-[280px] md:w-[300px] snap-start"
            >
              <OpportunityCard
                opportunity={opportunity}
                variant={layout === 'featured' ? 'featured' : 'default'}
                onOpen={onOpportunityClick}
                showProviderBadge={true}
                showXP={true}
              />
            </motion.div>
          ))}
        </div>

        {/* Right Fade */}
        <div 
          className={cn(
            'absolute right-0 top-0 bottom-0 w-8 md:w-16 z-10 pointer-events-none transition-opacity duration-300',
            canScrollRight ? 'opacity-100' : 'opacity-0'
          )}
          style={{
            background: 'linear-gradient(to left, var(--background), transparent)',
          }}
        />
      </div>

      {/* Drag Hint (shown on first load) */}
      <DragHint />
    </div>
  );
};

// ─── Featured Carousel (Larger cards) ──────────────────────────────────────

interface FeaturedCarouselProps {
  opportunities: MarketplaceOpportunity[];
  onOpportunityClick?: (opportunity: MarketplaceOpportunity) => void;
  className?: string;
}

export const FeaturedCarousel: React.FC<FeaturedCarouselProps> = ({
  opportunities,
  onOpportunityClick,
  className,
}) => {
  const scrollRef = useRef<HTMLDivElement>(null);
  
  if (opportunities.length === 0) {
    return null;
  }

  return (
    <div className={cn('relative', className)}>
      <div
        ref={scrollRef}
        className="flex gap-6 overflow-x-auto snap-x snap-mandatory scrollbar-hide pb-4 px-4 md:px-0"
      >
        {opportunities.slice(0, 4).map((opportunity, index) => (
          <motion.div
            key={opportunity.id}
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1, duration: 0.4 }}
            className="flex-shrink-0 w-full md:w-[calc(50%-12px)] lg:w-[calc(33.333%-16px)] snap-start"
          >
            <OpportunityCard
              opportunity={opportunity}
              variant="featured"
              onOpen={onOpportunityClick}
              showProviderBadge={false}
              showXP={true}
            />
          </motion.div>
        ))}
      </div>
    </div>
  );
};

// ─── Quick Wins Carousel (Compact) ──────────────────────────────────────────

interface QuickWinsCarouselProps {
  opportunities: MarketplaceOpportunity[];
  onOpportunityClick?: (opportunity: MarketplaceOpportunity) => void;
  className?: string;
}

export const QuickWinsCarousel: React.FC<QuickWinsCarouselProps> = ({
  opportunities,
  onOpportunityClick,
  className,
}) => {
  const scrollRef = useRef<HTMLDivElement>(null);
  
  if (opportunities.length === 0) {
    return null;
  }

  return (
    <div className={cn('relative', className)}>
      <div
        ref={scrollRef}
        className="flex gap-3 overflow-x-auto snap-x snap-mandatory scrollbar-hide pb-4 px-4 md:px-0"
      >
        {opportunities.map((opportunity, index) => (
          <motion.div
            key={opportunity.id}
            initial={{ opacity: 0, x: 30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.03, duration: 0.2 }}
            className="flex-shrink-0 w-[200px] md:w-[220px] snap-start"
          >
            <OpportunityCard
              opportunity={opportunity}
              variant="compact"
              onOpen={onOpportunityClick}
              showProviderBadge={false}
              showXP={false}
            />
          </motion.div>
        ))}
      </div>
    </div>
  );
};

// ─── Continue Carousel ──────────────────────────────────────────────────────

interface ContinueCarouselProps {
  opportunities: MarketplaceOpportunity[];
  onOpportunityClick?: (opportunity: MarketplaceOpportunity) => void;
  className?: string;
}

export const ContinueCarousel: React.FC<ContinueCarouselProps> = ({
  opportunities,
  onOpportunityClick,
  className,
}) => {
  if (opportunities.length === 0) {
    return null;
  }

  return (
    <div className={cn('relative', className)}>
      <div className="mb-3 px-4 md:px-0">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
            <Clock size={16} className="text-primary" />
          </div>
          <div>
            <h3 className="text-base font-bold text-text-primary">Continue Where You Left Off</h3>
            <p className="text-[10px] text-text-tertiary">Pick up where you started</p>
          </div>
        </div>
      </div>
      
      <div className="flex gap-4 overflow-x-auto snap-x snap-mandatory scrollbar-hide pb-4 px-4 md:px-0">
        {opportunities.slice(0, 5).map((opportunity, index) => (
          <motion.div
            key={opportunity.id}
            initial={{ opacity: 0, x: 30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.05, duration: 0.2 }}
            className="flex-shrink-0 w-[280px] snap-start"
          >
            <OpportunityCard
              opportunity={opportunity}
              variant="default"
              onOpen={onOpportunityClick}
              showProviderBadge={true}
              showXP={true}
            />
          </motion.div>
        ))}
      </div>
    </div>
  );
};

// ─── Helper Functions ───────────────────────────────────────────────────────

function getSourceConfig(source: SectionSource): { 
  icon: React.ComponentType<{ size?: number; style?: React.CSSProperties }>; 
  color: string;
} {
  const configs: Record<SectionSource, { icon: React.ComponentType<{ size?: number; style?: React.CSSProperties }>; color: string }> = {
    featured: { icon: Sparkles, color: '#3B82F6' },
    trending: { icon: TrendingUp, color: '#F59E0B' },
    personalized: { icon: Zap, color: '#8B5CF6' },
    continue: { icon: Clock, color: '#06B6D4' },
    category: { icon: Sparkles, color: '#3B82F6' },
    history: { icon: Clock, color: '#6B7280' },
    almost_complete: { icon: Clock, color: '#F59E0B' },
    expiring_soon: { icon: Clock, color: '#EF4444' },
    new_today: { icon: Sparkles, color: '#10B981' },
    highest_paying: { icon: TrendingUp, color: '#10B981' },
    fastest: { icon: Zap, color: '#3B82F6' },
  };
  
  return configs[source] || configs.featured;
}

const DragHint: React.FC = () => {
  const [shown, setShown] = useState(false);

  useEffect(() => {
    const hasSeenHint = localStorage.getItem('carousel-hint-seen');
    if (!hasSeenHint) {
      setShown(true);
      const timer = setTimeout(() => {
        setShown(false);
        localStorage.setItem('carousel-hint-seen', 'true');
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, []);

  if (!shown) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 10 }}
      className="absolute bottom-2 left-1/2 -translate-x-1/2 z-20 pointer-events-none"
    >
      <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-surface/90 backdrop-blur border border-border">
        <span className="text-[10px] text-text-tertiary">Drag to explore</span>
        <ChevronLeft size={12} className="text-text-tertiary" />
        <ChevronRight size={12} className="text-text-tertiary" />
      </div>
    </motion.div>
  );
};

export default OpportunityCarousel;
