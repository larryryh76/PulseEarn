/**
 * CategoryNavigation
 * 
 * Part 1 Foundation: Horizontal, scrollable, sticky after scrolling.
 * Animated indicator that glides smoothly between categories.
 * 
 * Categories are earning types, NOT providers.
 * Users should browse by what they want to earn, not by which provider offers it.
 */

import React, { useRef, useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import {
  Sparkles,
  Flame,
  BarChart3,
  Trophy,
  Smartphone,
  ShoppingBag,
  CreditCard,
  Play,
  GraduationCap,
  Users,
  UserPlus,
  TrendingUp,
  Gift,
  Star,
} from 'lucide-react';
import { OpportunityCategory, MARKETPLACE_CATEGORIES } from '../../types/marketplace';
import { cn } from '../../utils';

interface CategoryNavigationProps {
  categories: Array<{
    id: OpportunityCategory | 'all';
    label: string;
  }>;
  activeCategory: OpportunityCategory | 'all';
  onCategoryChange: (category: OpportunityCategory | 'all') => void;
  className?: string;
}

// Icon mapping for categories
const CATEGORY_ICONS: Record<string, React.ComponentType<{ size?: number; className?: string }>> = {
  featured: Sparkles,
  daily: Flame,
  surveys: BarChart3,
  games: Trophy,
  apps: Smartphone,
  shopping: ShoppingBag,
  cashback: CreditCard,
  videos: Play,
  learn: GraduationCap,
  community: Users,
  referrals: UserPlus,
  predictions: TrendingUp,
  seasonal: Gift,
  sponsored: Star,
};

export const CategoryNavigation: React.FC<CategoryNavigationProps> = ({
  categories,
  activeCategory,
  onCategoryChange,
  className,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isSticky, setIsSticky] = useState(false);
  const [indicatorStyle, setIndicatorStyle] = useState<React.CSSProperties>({});
  const buttonRefs = useRef<Map<string, HTMLButtonElement>>(new Map());

  // Handle sticky state
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        setIsSticky(!entry.isIntersecting);
      },
      { threshold: 0 }
    );

    observer.observe(container);
    return () => observer.disconnect();
  }, []);

  // Update indicator position
  useEffect(() => {
    const button = buttonRefs.current.get(activeCategory);
    const container = containerRef.current;
    if (!button || !container) return;

    const containerRect = container.getBoundingClientRect();
    const buttonRect = button.getBoundingClientRect();

    setIndicatorStyle({
      width: buttonRect.width,
      left: buttonRect.left - containerRect.left + container.scrollLeft,
    });
  }, [activeCategory]);

  const handleCategoryClick = (categoryId: OpportunityCategory | 'all') => {
    onCategoryChange(categoryId);
    
    // Scroll the selected category into view
    const button = buttonRefs.current.get(categoryId);
    if (button) {
      button.scrollIntoView({
        behavior: 'smooth',
        block: 'nearest',
        inline: 'center',
      });
    }
  };

  return (
    <div
      ref={containerRef}
      className={cn(
        'relative w-full',
        isSticky && 'sticky top-0 z-40',
        className
      )}
    >
      {/* Sticky Background */}
      {isSticky && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="absolute inset-0 bg-background/95 backdrop-blur-xl border-b border-border"
        />
      )}

      {/* Scrollable Container */}
      <div className="relative overflow-x-auto scrollbar-hide">
        <div className="flex items-center gap-1 px-4 py-3 min-w-max">
          {/* Animated Indicator */}
          <motion.div
            layout
            layoutId="category-indicator"
            style={indicatorStyle}
            className="absolute bottom-3 h-8 rounded-xl bg-primary/10 border border-primary/20 pointer-events-none"
            transition={{ type: 'spring', stiffness: 400, damping: 30 }}
          />

          {categories.map((category) => {
            const Icon = category.id === 'all' 
              ? Sparkles 
              : CATEGORY_ICONS[category.id] || Sparkles;
            const isActive = activeCategory === category.id;
            const categoryConfig = MARKETPLACE_CATEGORIES.find(c => c.id === category.id);
            const gradient = categoryConfig?.gradient || ['#3B82F6', '#8B5CF6'];
            const color = categoryConfig?.color || '#3B82F6';

            return (
              <button
                key={category.id}
                ref={(el) => {
                  if (el) buttonRefs.current.set(category.id, el);
                }}
                onClick={() => handleCategoryClick(category.id)}
                className={cn(
                  'relative flex items-center gap-2 px-4 py-2 rounded-xl',
                  'transition-all duration-200',
                  'hover:bg-white/5',
                  'focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/50',
                  isActive && 'text-primary'
                )}
              >
                <Icon 
                  size={16} 
                  className={cn(
                    'transition-colors',
                    isActive ? 'text-primary' : 'text-text-tertiary'
                  )} 
                />
                <span 
                  className={cn(
                    'text-xs font-bold uppercase tracking-wider whitespace-nowrap',
                    isActive ? 'text-primary' : 'text-text-secondary'
                  )}
                >
                  {category.label}
                </span>
                
                {/* Active glow */}
                {isActive && (
                  <motion.div
                    layoutId={`category-glow-${category.id}`}
                    className="absolute inset-0 rounded-xl opacity-50"
                    style={{
                      background: `linear-gradient(135deg, ${gradient[0]}20, ${gradient[1]}20)`,
                    }}
                  />
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Scroll Shadows */}
      <ScrollShadows containerRef={containerRef} />
    </div>
  );
};

// ─── Scroll Shadows ─────────────────────────────────────────────────────────

const ScrollShadows: React.FC<{ containerRef: React.RefObject<HTMLDivElement> }> = ({ 
  containerRef 
}) => {
  const [showLeftShadow, setShowLeftShadow] = useState(false);
  const [showRightShadow, setShowRightShadow] = useState(false);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const checkScroll = () => {
      setShowLeftShadow(container.scrollLeft > 10);
      setShowRightShadow(
        container.scrollLeft < container.scrollWidth - container.clientWidth - 10
      );
    };

    checkScroll();
    container.addEventListener('scroll', checkScroll, { passive: true });
    window.addEventListener('resize', checkScroll, { passive: true });

    return () => {
      container.removeEventListener('scroll', checkScroll);
      window.removeEventListener('resize', checkScroll);
    };
  }, [containerRef]);

  return (
    <>
      {/* Left Shadow */}
      <div
        className={cn(
          'absolute left-0 top-0 bottom-0 w-12 pointer-events-none transition-opacity duration-200 z-10',
          'bg-gradient-to-r from-background to-transparent',
          showLeftShadow ? 'opacity-100' : 'opacity-0'
        )}
      />
      
      {/* Right Shadow */}
      <div
        className={cn(
          'absolute right-0 top-0 bottom-0 w-12 pointer-events-none transition-opacity duration-200 z-10',
          'bg-gradient-to-l from-background to-transparent',
          showRightShadow ? 'opacity-100' : 'opacity-0'
        )}
      />
    </>
  );
};

export default CategoryNavigation;
