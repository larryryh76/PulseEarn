/**
 * MarketplaceHero
 * 
 * Part 1 Foundation: The Hero becomes the visual anchor of PulseEarn.
 * This section embodies the premium rewards economy platform philosophy.
 * 
 * Features:
 * - Large artwork with animated background
 * - Beautiful gradients and subtle motion
 * - Reward dominates the visual hierarchy
 * - One primary CTA: START EARNING
 * - Auto-rotating featured campaigns
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Sparkles,
  Clock,
  Zap,
  ChevronRight,
  Star
} from 'lucide-react';
import { MarketplaceOpportunity } from '../../types/marketplace';
import { cn } from '../../utils';

interface MarketplaceHeroProps {
  opportunities: MarketplaceOpportunity[];
  onStartEarning: (opportunity: MarketplaceOpportunity) => void;
  autoRotate?: boolean;
  rotationInterval?: number;
  className?: string;
}

export const MarketplaceHero: React.FC<MarketplaceHeroProps> = ({
  opportunities,
  onStartEarning,
  autoRotate = true,
  rotationInterval = 8000,
  className,
}) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  
  // Get featured/high-priority opportunities
  const featuredOpportunities = opportunities.filter(
    opp => opp.metadata.category === 'featured' || 
           opp.metadata.category === 'daily' ||
           opp.metadata.category === 'sponsored'
  ).slice(0, 5);
  
  // Fallback to highest paying opportunities if no featured
  const displayOpportunities = featuredOpportunities.length > 0
    ? featuredOpportunities
    : opportunities.slice(0, 5);

  // Clamp currentIndex when displayOpportunities changes
  useEffect(() => {
    if (displayOpportunities.length === 0) {
      setCurrentIndex(0);
    } else if (currentIndex >= displayOpportunities.length) {
      setCurrentIndex(displayOpportunities.length - 1);
    }
  }, [displayOpportunities.length, currentIndex]);

  // Auto-rotate through campaigns
  useEffect(() => {
    if (!autoRotate || displayOpportunities.length <= 1) return;

    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % displayOpportunities.length);
    }, rotationInterval);

    return () => clearInterval(interval);
  }, [autoRotate, displayOpportunities.length, rotationInterval]);

  const currentOpportunity = displayOpportunities[currentIndex];
  
  if (!currentOpportunity) {
    return null;
  }

  return (
    <div className={cn('relative w-full', className)}>
      {/* Auto-rotate indicators */}
      {displayOpportunities.length > 1 && (
        <div className="absolute top-4 right-4 z-20 flex items-center gap-1.5">
          {displayOpportunities.map((_, index) => (
            <button
              key={index}
              onClick={() => setCurrentIndex(index)}
              className={cn(
                'w-2 h-2 rounded-full transition-all duration-300',
                index === currentIndex 
                  ? 'bg-white w-6' 
                  : 'bg-white/30 hover:bg-white/50'
              )}
              aria-label={`Go to campaign ${index + 1}`}
            />
          ))}
        </div>
      )}

      <AnimatePresence mode="wait">
        <motion.div
          key={currentOpportunity.id}
          initial={{ opacity: 0, scale: 1.05 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
          className="relative rounded-3xl overflow-hidden cursor-pointer group"
          onClick={() => onStartEarning(currentOpportunity)}
        >
          {/* Animated Background */}
          <HeroBackground opportunity={currentOpportunity} />
          
          {/* Content Container */}
          <div className="relative z-10 p-8 md:p-12 lg:p-16 min-h-[400px] md:min-h-[480px] flex flex-col justify-end">
            {/* Featured Badge */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="absolute top-6 left-6 md:top-8 md:left-8"
            >
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 backdrop-blur-md border border-white/20">
                <Sparkles size={14} className="text-amber-400" />
                <span className="text-[10px] font-bold uppercase tracking-widest text-white">
                  Featured Campaign
                </span>
              </div>
            </motion.div>

            {/* Category Tag */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.25 }}
              className="absolute top-6 right-20 md:top-8 md:right-24"
            >
              <div className="px-3 py-1.5 rounded-full bg-white/10 backdrop-blur-md border border-white/20">
                <span className="text-[9px] font-bold uppercase tracking-widest text-white/80">
                  {formatCategory(currentOpportunity.metadata.category)}
                </span>
              </div>
            </motion.div>

            {/* Main Content */}
            <div className="space-y-6 max-w-2xl">
              {/* Title */}
              <motion.h2
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="text-3xl md:text-4xl lg:text-5xl font-black text-white leading-tight"
              >
                {currentOpportunity.title}
              </motion.h2>

              {/* Description */}
              <motion.p
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
                className="text-sm md:text-base text-white/70 leading-relaxed max-w-xl"
              >
                {currentOpportunity.description}
              </motion.p>

              {/* Stats Row */}
              <motion.div
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
                className="flex flex-wrap items-center gap-4 md:gap-6"
              >
                {/* Reward */}
                <div className="flex items-baseline gap-2">
                  <span className="text-4xl md:text-5xl font-black text-emerald-400">
                    +{currentOpportunity.reward.points.toLocaleString()}
                  </span>
                  <span className="text-sm font-bold text-white/60 uppercase tracking-wider">
                    PTS
                  </span>
                </div>

                {/* XP */}
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-amber-500/20 border border-amber-500/30">
                  <Zap size={14} className="text-amber-400" />
                  <span className="text-sm font-bold text-amber-400">
                    +{currentOpportunity.reward.xp} XP
                  </span>
                </div>

                {/* Time */}
                <div className="flex items-center gap-2 text-white/60">
                  <Clock size={14} />
                  <span className="text-sm font-medium">
                    {currentOpportunity.metadata.estimatedTime}
                  </span>
                </div>
              </motion.div>

              {/* CTA Button */}
              <motion.div
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.6 }}
                className="pt-4"
              >
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onStartEarning(currentOpportunity);
                  }}
                  className={cn(
                    'group/btn inline-flex items-center gap-3 px-8 py-4 rounded-2xl',
                    'bg-white text-black font-bold text-sm uppercase tracking-wider',
                    'hover:bg-emerald-400 transition-all duration-300',
                    'shadow-2xl shadow-emerald-500/25 hover:shadow-emerald-500/40',
                    'hover:scale-105 active:scale-95'
                  )}
                >
                  <Star size={16} className="text-amber-500" />
                  <span>Start Earning</span>
                  <ChevronRight 
                    size={16} 
                    className="group-hover/btn:translate-x-1 transition-transform" 
                  />
                </button>
              </motion.div>
            </div>

            {/* Decorative Elements */}
            <DecorativeElements />
          </div>

          {/* Hover Overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
        </motion.div>
      </AnimatePresence>
    </div>
  );
};

// ─── Sub-components ─────────────────────────────────────────────────────────

const HeroBackground: React.FC<{ opportunity: MarketplaceOpportunity }> = ({ opportunity }) => {
  // Use artwork if available, otherwise use gradient
  const hasArtwork = opportunity.metadata.artwork || opportunity.metadata.thumbnail;
  
  return (
    <>
      {/* Base gradient background */}
      <div 
        className="absolute inset-0 bg-gradient-to-br from-violet-900 via-purple-900 to-indigo-900"
        style={{
          background: hasArtwork 
            ? undefined 
            : 'linear-gradient(135deg, #1e1b4b 0%, #312e81 25%, #4c1d95 50%, #5b21b6 75%, #6d28d9 100%)'
        }}
      />
      
      {/* Artwork overlay */}
      {hasArtwork && (
        <div 
          className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: `url(${opportunity.metadata.artwork || opportunity.metadata.thumbnail})` }}
        />
      )}
      
      {/* Animated gradient overlay */}
      <motion.div
        animate={{
          background: [
            'radial-gradient(ellipse at 20% 80%, rgba(139, 92, 246, 0.4) 0%, transparent 50%)',
            'radial-gradient(ellipse at 80% 20%, rgba(59, 130, 246, 0.4) 0%, transparent 50%)',
            'radial-gradient(ellipse at 50% 50%, rgba(236, 72, 153, 0.3) 0%, transparent 50%)',
            'radial-gradient(ellipse at 20% 80%, rgba(139, 92, 246, 0.4) 0%, transparent 50%)',
          ],
        }}
        transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut' }}
        className="absolute inset-0"
      />
      
      {/* Noise texture overlay */}
      <div 
        className="absolute inset-0 opacity-20"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 400 400' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`,
        }}
      />
      
      {/* Bottom gradient for content readability */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
    </>
  );
};

const DecorativeElements: React.FC = () => (
  <>
    {/* Floating particles */}
    {[...Array(6)].map((_, i) => (
      <motion.div
        key={i}
        animate={{
          y: [-20, 20, -20],
          opacity: [0.3, 0.6, 0.3],
          scale: [1, 1.2, 1],
        }}
        transition={{
          duration: 3 + i * 0.5,
          repeat: Infinity,
          delay: i * 0.3,
        }}
        className={cn(
          'absolute w-2 h-2 rounded-full',
          i % 2 === 0 ? 'bg-amber-400' : 'bg-emerald-400'
        )}
        style={{
          left: `${15 + i * 15}%`,
          top: `${20 + (i % 3) * 20}%`,
        }}
      />
    ))}
    
    {/* Glow effects */}
    <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-amber-500/20 rounded-full blur-[100px]" />
    <div className="absolute bottom-1/4 right-1/4 w-64 h-64 bg-emerald-500/20 rounded-full blur-[100px]" />
  </>
);

// ─── Utilities ─────────────────────────────────────────────────────────────

function formatCategory(category: string): string {
  return category
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

export default MarketplaceHero;
