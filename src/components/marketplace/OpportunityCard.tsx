/**
 * OpportunityCard
 * 
 * Unified card component for displaying all opportunity types
 * (internal and provider) in the PulseEarn Marketplace.
 * 
 * Features:
 * - Consistent design regardless of source
 * - Provider badge (subtle, not dominant)
 * - Multiple size variants
 * - Rich micro-interactions
 * - Status indicators
 */

import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  Clock,
  TrendingUp,
  Sparkles,
  ChevronRight,
  ArrowUpRight,
  CheckCircle2,
  AlertCircle,
  Lock,
  Flame,
} from 'lucide-react';
import { MarketplaceOpportunity, DIFFICULTY_CONFIG } from '../../types/marketplace';
import { cn } from '../../utils';

// ─── Card Variants ────────────────────────────────────────────────────────────

export type CardVariant = 'default' | 'compact' | 'featured' | 'row';

interface OpportunityCardProps {
  opportunity: MarketplaceOpportunity;
  variant?: CardVariant;
  onOpen?: (opportunity: MarketplaceOpportunity) => void;
  showProviderBadge?: boolean;
  showXP?: boolean;
  className?: string;
}

// ─── Component ────────────────────────────────────────────────────────────────

export const OpportunityCard: React.FC<OpportunityCardProps> = ({
  opportunity,
  variant = 'default',
  onOpen,
  showProviderBadge = true,
  showXP = true,
  className,
}) => {
  const { opportunity: opp, status: cardStatus } = useOpportunityState(opportunity);
  
  const difficulty = DIFFICULTY_CONFIG[opp.metadata.difficulty];
  const isLocked = Boolean(opp.metadata.minLevel && opp.status === 'locked');
  
  const handleClick = () => {
    if (onOpen && cardStatus !== 'locked') {
      onOpen(opp);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      handleClick();
    }
  };

  // Render based on variant
  switch (variant) {
    case 'compact':
      return (
        <CompactCard
          opportunity={opp}
          status={cardStatus}
          difficulty={difficulty}
          showProviderBadge={showProviderBadge}
          showXP={showXP}
          onOpen={handleClick}
          onKeyDown={handleKeyDown}
          isLocked={isLocked}
          className={className}
        />
      );
    
    case 'featured':
      return (
        <FeaturedCard
          opportunity={opp}
          status={cardStatus}
          difficulty={difficulty}
          showProviderBadge={showProviderBadge}
          showXP={showXP}
          onOpen={handleClick}
          onKeyDown={handleKeyDown}
          isLocked={isLocked}
          className={className}
        />
      );
    
    case 'row':
      return (
        <RowCard
          opportunity={opp}
          status={cardStatus}
          difficulty={difficulty}
          showProviderBadge={showProviderBadge}
          showXP={showXP}
          onOpen={handleClick}
          onKeyDown={handleKeyDown}
          isLocked={isLocked}
          className={className}
        />
      );
    
    default:
      return (
        <DefaultCard
          opportunity={opp}
          status={cardStatus}
          difficulty={difficulty}
          showProviderBadge={showProviderBadge}
          showXP={showXP}
          onOpen={handleClick}
          onKeyDown={handleKeyDown}
          isLocked={isLocked}
          className={className}
        />
      );
  }
};

// ─── Default Card ─────────────────────────────────────────────────────────────

interface CardProps {
  opportunity: MarketplaceOpportunity;
  status: 'available' | 'completed' | 'pending' | 'cooldown' | 'locked';
  difficulty: { label: string; color: string; bgColor: string };
  showProviderBadge: boolean;
  showXP: boolean;
  onOpen: () => void;
  onKeyDown: (e: React.KeyboardEvent) => void;
  isLocked: boolean;
  className?: string;
}

const DefaultCard: React.FC<CardProps> = ({
  opportunity,
  status,
  difficulty,
  showProviderBadge,
  showXP,
  onOpen,
  onKeyDown,
  className,
}) => {
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      whileHover={status !== 'locked' ? { y: -4, scale: 1.01 } : {}}
      whileTap={status !== 'locked' ? { scale: 0.98 } : {}}
      transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] as const }}
      className={cn(
        'group relative rounded-2xl border bg-surface overflow-hidden',
        'transition-all duration-300 cursor-pointer',
        status === 'locked'
          ? 'border-border opacity-50 cursor-not-allowed'
          : 'hover:border-primary/30 hover:shadow-xl hover:shadow-primary/5',
        className
      )}
      onClick={onOpen}
      onKeyDown={onKeyDown}
      tabIndex={status === 'locked' ? -1 : 0}
      role="button"
      aria-label={`Open ${opportunity.title}`}
    >
      {/* Gradient accent */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
      
      {/* Content */}
      <div className="relative p-5 space-y-4">
        {/* Header: Category + Difficulty */}
        <div className="flex items-center justify-between">
          <span className="text-[9px] font-bold uppercase tracking-widest text-text-tertiary">
            {formatCategory(opportunity.metadata.category)}
          </span>
          <span
            className="px-2 py-0.5 rounded-full text-[8px] font-black uppercase tracking-wider"
            style={{
              backgroundColor: difficulty.bgColor,
              color: difficulty.color,
            }}
          >
            {difficulty.label}
          </span>
        </div>

        {/* Title + Description */}
        <div className="space-y-2">
          <h3 className="text-sm font-bold text-text-primary group-hover:text-primary transition-colors line-clamp-2 leading-snug">
            {opportunity.title}
          </h3>
          <p className="text-xs text-text-tertiary line-clamp-2 leading-relaxed">
            {opportunity.description}
          </p>
        </div>

        {/* Estimated Time */}
        <div className="flex items-center gap-1.5 text-text-tertiary">
          <Clock size={11} />
          <span className="text-[10px] font-medium">{opportunity.metadata.estimatedTime}</span>
        </div>

        {/* Footer: Reward + CTA */}
        <div className="flex items-center justify-between pt-3 border-t border-white/5">
          <div className="space-y-0.5">
            <div className="flex items-baseline gap-1">
              <span className="text-lg font-black text-emerald-400 tabular-nums">
                +{opportunity.reward.points.toLocaleString()}
              </span>
              <span className="text-[9px] font-bold text-text-tertiary uppercase">PTS</span>
            </div>
            {showXP && (
              <span className="text-[9px] font-semibold text-text-tertiary">
                +{opportunity.reward.xp} XP
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            {/* Status indicator */}
            {status === 'completed' && (
              <div className="flex items-center gap-1 text-emerald-400">
                <CheckCircle2 size={12} />
                <span className="text-[9px] font-bold">Done</span>
              </div>
            )}
            {status === 'pending' && (
              <div className="flex items-center gap-1 text-warning">
                <AlertCircle size={12} />
                <span className="text-[9px] font-bold">Pending</span>
              </div>
            )}
            {status === 'cooldown' && (
              <div className="flex items-center gap-1 text-text-tertiary">
                <Flame size={12} />
                <span className="text-[9px] font-bold">Cooldown</span>
              </div>
            )}
            {status === 'locked' && (
              <div className="flex items-center gap-1 text-text-tertiary">
                <Lock size={12} />
                <span className="text-[9px] font-bold">Locked</span>
              </div>
            )}
            
            {/* CTA Button */}
            {status === 'available' && (
              <div className="flex items-center gap-1 px-3 py-2 rounded-xl bg-primary/10 border border-primary/20 text-primary group-hover:bg-primary group-hover:text-white group-hover:border-primary transition-all">
                <span className="text-[9px] font-black uppercase tracking-wider">Start</span>
                <ArrowUpRight size={11} />
              </div>
            )}
          </div>
        </div>

        {/* Provider Badge (subtle) */}
        {showProviderBadge && opportunity.source === 'provider' && opportunity.providerName && (
          <div className="absolute bottom-2 right-3">
            <span className="text-[8px] text-text-tertiary/50 font-medium">
              via {opportunity.providerName}
            </span>
          </div>
        )}
      </div>

      {/* Badges */}
      {opportunity.engagement.isNew && status === 'available' && (
        <div className="absolute top-3 left-3">
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-blue-500/20 border border-blue-500/30 text-blue-400 text-[8px] font-black uppercase tracking-wider">
            <Sparkles size={8} /> NEW
          </span>
        </div>
      )}
      {opportunity.engagement.trending && status === 'available' && (
        <div className="absolute top-3 left-3">
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-orange-500/20 border border-orange-500/30 text-orange-400 text-[8px] font-black uppercase tracking-wider">
            <TrendingUp size={8} /> TRENDING
          </span>
        </div>
      )}
    </motion.div>
  );
};

// ─── Compact Card ─────────────────────────────────────────────────────────────

const CompactCard: React.FC<CardProps> = ({
  opportunity,
  showProviderBadge,
  showXP,
  onOpen,
  onKeyDown,
  isLocked,
  className,
}) => {
  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      whileHover={!isLocked ? { y: -2 } : {}}
      className={cn(
        'group relative rounded-xl border bg-surface p-3',
        'transition-all duration-200 cursor-pointer',
        isLocked
          ? 'border-border opacity-50 cursor-not-allowed'
          : 'hover:border-primary/30',
        className
      )}
      onClick={onOpen}
      onKeyDown={onKeyDown}
      tabIndex={isLocked ? -1 : 0}
      role="button"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <span className="text-[8px] font-bold uppercase tracking-widest text-text-tertiary">
            {formatCategory(opportunity.metadata.category)}
          </span>
          <h4 className="text-xs font-bold text-text-primary group-hover:text-primary transition-colors line-clamp-1 mt-0.5">
            {opportunity.title}
          </h4>
        </div>
        <div className="p-1.5 rounded-lg bg-primary/10 border border-primary/20 text-primary group-hover:bg-primary group-hover:text-white transition-all shrink-0">
          <ChevronRight size={12} />
        </div>
      </div>

      <div className="flex items-center justify-between mt-3 pt-2 border-t border-white/5">
        <div>
          <span className="text-sm font-black text-emerald-400">+{opportunity.reward.points}</span>
          {showXP && (
            <span className="text-[8px] text-text-tertiary ml-1">+{opportunity.reward.xp} XP</span>
          )}
        </div>
        <span className="text-[9px] text-text-tertiary">{opportunity.metadata.estimatedTime}</span>
      </div>

      {showProviderBadge && opportunity.source === 'provider' && (
        <span className="text-[7px] text-text-tertiary/50 mt-1 block">
          via {opportunity.providerName}
        </span>
      )}
    </motion.div>
  );
};

// ─── Featured Card ─────────────────────────────────────────────────────────────

const FeaturedCard: React.FC<CardProps> = ({
  opportunity,
  status,
  showXP,
  onOpen,
  onKeyDown,
  isLocked,
  className,
}) => {
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={!isLocked ? { y: -6, scale: 1.02 } : {}}
      transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] as const }}
      className={cn(
        'group relative rounded-3xl border border-white/5 bg-gradient-to-br from-[#12121A] to-[#0A0A0F] overflow-hidden',
        'transition-all duration-300 cursor-pointer',
        isLocked
          ? 'opacity-50 cursor-not-allowed'
          : 'hover:border-primary/30 hover:shadow-2xl hover:shadow-primary/5',
        className
      )}
      onClick={onOpen}
      onKeyDown={onKeyDown}
      tabIndex={isLocked ? -1 : 0}
      role="button"
    >
      {/* Decorative elements */}
      <div className="absolute top-0 right-0 w-44 h-44 bg-primary/10 rounded-full blur-[60px] group-hover:bg-primary/15 transition-colors" />
      <div className="absolute bottom-0 left-0 w-32 h-32 bg-accent/5 rounded-full blur-[40px]" />

      <div className="relative p-6 space-y-4 min-h-[200px] flex flex-col justify-between">
        {/* Header */}
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-primary/15 border border-primary/30 text-primary text-[8px] font-black uppercase tracking-widest">
              <Sparkles size={8} /> FEATURED
            </span>
            <span className="text-[9px] text-text-tertiary uppercase tracking-wider">
              {formatCategory(opportunity.metadata.category)}
            </span>
          </div>

          <h3 className="text-base font-black text-white group-hover:text-primary transition-colors leading-tight">
            {opportunity.title}
          </h3>
          <p className="text-xs text-text-tertiary leading-relaxed line-clamp-2">
            {opportunity.description}
          </p>
        </div>

        {/* Footer */}
        <div className="flex items-end justify-between pt-4 border-t border-white/5">
          <div>
            <span className="text-[9px] font-bold text-text-tertiary uppercase tracking-widest">
              Ecosystem Payload
            </span>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-2xl font-black text-emerald-400">
                +{opportunity.reward.points.toLocaleString()}
              </span>
              <span className="text-xs font-semibold text-text-tertiary">PTS</span>
            </div>
            {showXP && (
              <span className="text-[10px] text-text-tertiary">+{opportunity.reward.xp} XP</span>
            )}
          </div>

          {status === 'available' && !isLocked && (
            <div className="px-4 py-2.5 rounded-xl bg-primary hover:bg-primary-bright text-white text-[9px] font-black uppercase tracking-wider transition-all flex items-center gap-2 shadow-lg shadow-primary/20">
              Start <ArrowUpRight size={12} />
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
};

// ─── Row Card ─────────────────────────────────────────────────────────────────

const RowCard: React.FC<CardProps> = ({
  opportunity,
  showXP,
  onOpen,
  onKeyDown,
  isLocked,
  className,
}) => {
  return (
    <motion.div
      layout
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      whileHover={!isLocked ? { x: 4 } : {}}
      transition={{ duration: 0.2 }}
      className={cn(
        'group flex items-center justify-between p-4 rounded-xl border bg-surface',
        'transition-all duration-200 cursor-pointer',
        isLocked
          ? 'border-border opacity-50 cursor-not-allowed'
          : 'hover:border-primary/30',
        className
      )}
      onClick={onOpen}
      onKeyDown={onKeyDown}
      tabIndex={isLocked ? -1 : 0}
      role="button"
    >
      <div className="flex items-center gap-4 min-w-0">
        <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0">
          <span className="text-[10px] font-black text-primary">
            {formatCategory(opportunity.metadata.category).charAt(0)}
          </span>
        </div>
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h4 className="text-xs font-bold text-text-primary group-hover:text-primary transition-colors truncate">
              {opportunity.title}
            </h4>
            {opportunity.engagement.trending && (
              <TrendingUp size={10} className="text-orange-400 shrink-0" />
            )}
          </div>
          <p className="text-[10px] text-text-tertiary truncate mt-0.5">
            {opportunity.description}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-4 shrink-0">
        <div className="text-right">
          <span className="text-sm font-black text-emerald-400">
            +{opportunity.reward.points.toLocaleString()}
          </span>
          {showXP && (
            <span className="text-[8px] text-text-tertiary ml-1">+{opportunity.reward.xp} XP</span>
          )}
        </div>
        <div className="p-1.5 rounded-lg bg-primary/10 border border-primary/20 text-primary group-hover:bg-primary group-hover:text-white transition-all">
          <ChevronRight size={12} />
        </div>
      </div>
    </motion.div>
  );
};

// ─── Hooks ─────────────────────────────────────────────────────────────────────

function useOpportunityState(opportunity: MarketplaceOpportunity) {
  return useMemo(() => {
    // Determine effective status
    let status: 'available' | 'completed' | 'pending' | 'cooldown' | 'locked' = 'available';
    
    switch (opportunity.status) {
      case 'completed':
        status = 'completed';
        break;
      case 'pending':
        status = 'pending';
        break;
      case 'cooldown':
        status = 'cooldown';
        break;
      case 'locked':
        status = 'locked';
        break;
      default:
        // Check if on cooldown based on nextAvailableAt
        if (opportunity.nextAvailableAt && opportunity.nextAvailableAt > new Date()) {
          status = 'cooldown';
        }
    }

    return { opportunity, status };
  }, [opportunity]);
}

// ─── Utilities ────────────────────────────────────────────────────────────────

function formatCategory(category: string): string {
  return category
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

export default OpportunityCard;
