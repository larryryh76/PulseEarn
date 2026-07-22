/**
 * OpportunityCard Component
 * 
 * A beautifully crafted, high-contrast, premium card component for the PulseEarn rewards ecosystem.
 * Modeled after design principles of Coinbase, Apple App Store, and Stripe.
 * 
 * Features:
 * - High-density clean typography pairing: Inter & JetBrains Mono.
 * - Staggered entrance animations.
 * - Subtle hover actions (smooth lift, active-state tactile scale).
 * - Human-centric copy and precise micro-interactions.
 * - Clear visual indicators for rewards, XP, duration, and verification status.
 */

import React from 'react';
import { motion } from 'framer-motion';
import {
  Clock,
  ShieldCheck,
  ChevronRight,
  Flame,
  Lock,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  Trophy,
  Smartphone,
  ShoppingBag,
  CreditCard,
  Play,
  GraduationCap,
  Users,
  UserPlus,
  Gift,
  Star,
  Compass,
  TrendingUp
} from 'lucide-react';
import { MarketplaceOpportunity, DIFFICULTY_CONFIG } from '../../types/marketplace';
import { cn } from '../../utils';

export type CardVariant = 'default' | 'compact' | 'featured' | 'row';

interface OpportunityCardProps {
  opportunity: MarketplaceOpportunity;
  variant?: CardVariant;
  onOpen?: (opportunity: MarketplaceOpportunity) => void;
  showProviderBadge?: boolean;
  showXP?: boolean;
  className?: string;
}

// Map categories to modern Lucide icons
export const CategoryIcon: React.FC<{ category: string; className?: string; size?: number }> = ({
  category,
  className,
  size = 14
}) => {
  const iconProps = { className, size };
  switch (category) {
    case 'featured': return <Star {...iconProps} className={cn("text-amber-400", className)} />;
    case 'daily': return <Flame {...iconProps} className={cn("text-rose-500", className)} />;
    case 'surveys': return <HelpCircle {...iconProps} className={cn("text-emerald-500", className)} />;
    case 'games': return <Trophy {...iconProps} className={cn("text-violet-500", className)} />;
    case 'apps': return <Smartphone {...iconProps} className={cn("text-blue-500", className)} />;
    case 'shopping': return <ShoppingBag {...iconProps} className={cn("text-amber-500", className)} />;
    case 'cashback': return <CreditCard {...iconProps} className={cn("text-teal-500", className)} />;
    case 'videos': return <Play {...iconProps} className={cn("text-pink-500", className)} />;
    case 'learn': return <GraduationCap {...iconProps} className={cn("text-lime-500", className)} />;
    case 'community': return <Users {...iconProps} className={cn("text-sky-500", className)} />;
    case 'referrals': return <UserPlus {...iconProps} className={cn("text-pink-500", className)} />;
    case 'predictions': return <TrendingUp {...iconProps} className={cn("text-indigo-500", className)} />;
    case 'seasonal': return <Gift {...iconProps} className={cn("text-rose-500", className)} />;
    default: return <Compass {...iconProps} className={cn("text-primary", className)} />;
  }
};

// Map categories to user-friendly readable titles
export function formatCategory(category: string): string {
  if (category === 'daily') return 'Daily Pick';
  return category
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

// Normalize estimated times for clean presentation
export function formatEstimatedTime(timeStr: string | undefined): string {
  if (!timeStr) return '5 min';
  const t = timeStr.toLowerCase().trim();
  if (t.includes('daily') || t === 'daily') return 'Daily Refresh';
  if (t.includes('ongoing') || t === 'ongoing') return 'Ongoing';
  
  const numMatch = t.match(/(\d+)/);
  if (!numMatch) {
    return timeStr.charAt(0).toUpperCase() + timeStr.slice(1);
  }
  const num = numMatch[1];
  if (t.includes('day') || t.includes('d')) return `${num} ${parseInt(num) === 1 ? 'day' : 'days'}`;
  if (t.includes('hour') || t.includes('h')) return `${num} ${parseInt(num) === 1 ? 'hr' : 'hrs'}`;
  if (t.includes('min') || t.includes('m')) return `${num} ${parseInt(num) === 1 ? 'min' : 'mins'}`;
  return timeStr;
}

export const OpportunityCard: React.FC<OpportunityCardProps> = ({
  opportunity,
  variant = 'default',
  onOpen,
  showProviderBadge = true,
  className
}) => {
  const status = opportunity.status;
  const isLocked = status === 'locked';
  const isCompleted = status === 'completed';
  const isPending = status === 'pending';
  const isCooldown = status === 'cooldown';

  const handleCardClick = () => {
    if (!isLocked && onOpen) {
      onOpen(opportunity);
    }
  };

  // Modern UI badge style mapping based on opportunity metadata
  const difficulty = DIFFICULTY_CONFIG[opportunity.metadata.difficulty] || DIFFICULTY_CONFIG.easy;

  if (variant === 'compact') {
    return (
      <motion.div
        whileHover={!isLocked ? { y: -3, scale: 1.01 } : {}}
        whileTap={!isLocked ? { scale: 0.98 } : {}}
        onClick={handleCardClick}
        className={cn(
          "group relative flex flex-col justify-between p-5 rounded-2xl bg-surface border border-border transition-smooth cursor-pointer shadow-subtle hover:border-primary/20",
          isLocked && "opacity-40 cursor-not-allowed hover:border-border",
          className
        )}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-1">
            <div className="flex items-center gap-1.5 text-[9px] font-bold text-text-tertiary uppercase tracking-wider">
              <CategoryIcon category={opportunity.metadata.category} size={11} />
              <span>{formatCategory(opportunity.metadata.category)}</span>
            </div>
            <h4 className="text-xs font-semibold text-text-primary group-hover:text-primary transition-colors leading-snug tracking-tight line-clamp-1">
              {opportunity.title}
            </h4>
          </div>
          <div className="p-1.5 rounded-lg bg-surface-bright border border-border group-hover:bg-primary group-hover:text-white transition-all shrink-0">
            <ChevronRight size={12} />
          </div>
        </div>

        <div className="flex items-center justify-between mt-4 pt-3 border-t border-border/50 text-[10px] font-medium font-mono text-text-secondary">
          <div className="flex items-baseline gap-1">
            <span className="text-sm font-black text-emerald-500 font-mono">+{opportunity.reward.points.toLocaleString()}</span>
            <span className="text-[8px] text-text-tertiary font-bold uppercase">PTS</span>
          </div>
          <span className="text-[9px] font-sans font-medium text-text-tertiary">{formatEstimatedTime(opportunity.metadata.estimatedTime)}</span>
        </div>
      </motion.div>
    );
  }

  if (variant === 'row') {
    return (
      <motion.div
        whileHover={!isLocked ? { x: 3 } : {}}
        onClick={handleCardClick}
        className={cn(
          "group flex items-center justify-between p-4.5 rounded-2xl bg-surface border border-border hover:border-primary/20 transition-smooth cursor-pointer shadow-subtle",
          isLocked && "opacity-40 cursor-not-allowed hover:border-border",
          className
        )}
      >
        <div className="flex items-center gap-4 min-w-0">
          <div className="w-10 h-10 rounded-xl bg-surface-bright flex items-center justify-center border border-border shrink-0">
            <CategoryIcon category={opportunity.metadata.category} size={16} />
          </div>
          <div className="min-w-0 space-y-0.5">
            <div className="flex items-center gap-2">
              <h4 className="text-xs font-semibold text-text-primary group-hover:text-primary transition-colors truncate tracking-tight">
                {opportunity.title}
              </h4>
              {opportunity.engagement.trending && (
                <span className="text-[8px] font-extrabold text-orange-500 bg-orange-500/10 px-1.5 py-0.5 rounded uppercase tracking-wider">Trending</span>
              )}
            </div>
            <p className="text-[11px] text-text-tertiary truncate max-w-sm sm:max-w-md">
              {opportunity.description}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-4 shrink-0">
          <div className="text-right">
            <span className="text-sm font-black text-emerald-500 font-mono block">
              +{opportunity.reward.points.toLocaleString()}
            </span>
            <span className="text-[8px] font-black text-text-tertiary font-mono block uppercase">+{opportunity.reward.xp} XP</span>
          </div>
          <div className="p-1.5 rounded-lg bg-surface-bright border border-border text-text-tertiary group-hover:bg-primary group-hover:text-white transition-all">
            <ChevronRight size={12} />
          </div>
        </div>
      </motion.div>
    );
  }

  // DEFAULT / STANDARD CARD (Coinbase-style bento grid card)
  return (
    <motion.div
      whileHover={!isLocked ? { y: -5 } : {}}
      onClick={handleCardClick}
      className={cn(
        "group relative flex flex-col justify-between rounded-2xl bg-surface border border-border overflow-hidden transition-smooth cursor-pointer shadow-subtle hover:border-primary/30 hover:shadow-premium",
        isLocked && "opacity-50 cursor-not-allowed hover:border-border hover:shadow-subtle",
        className
      )}
    >
      {/* Visual Anchor / Thumbnail header if present */}
      <div className="relative h-32 w-full bg-surface-bright border-b border-border overflow-hidden flex items-center justify-center">
        {opportunity.metadata.thumbnail || opportunity.metadata.artwork ? (
          <img
            src={opportunity.metadata.thumbnail || opportunity.metadata.artwork}
            alt={opportunity.title}
            className="w-full h-full object-cover group-hover:scale-102 transition-transform duration-500"
            referrerPolicy="no-referrer"
          />
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-primary/10 flex items-center justify-center">
            <div className="w-12 h-12 rounded-2xl bg-surface flex items-center justify-center border border-border shadow-sm">
              <CategoryIcon category={opportunity.metadata.category} size={22} />
            </div>
          </div>
        )}

        {/* Floating overlays for category & difficulty */}
        <div className="absolute top-3 left-3 flex items-center gap-1.5">
          <div className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-background/80 backdrop-blur-md border border-border/40 text-[9px] font-bold text-text-primary shadow-sm">
            <CategoryIcon category={opportunity.metadata.category} size={10} />
            <span>{formatCategory(opportunity.metadata.category)}</span>
          </div>
        </div>

        <div className="absolute top-3 right-3">
          <span
            className="px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-widest border"
            style={{
              backgroundColor: difficulty.bgColor,
              borderColor: `${difficulty.color}25`,
              color: difficulty.color,
            }}
          >
            {difficulty.label}
          </span>
        </div>

        {/* Status tags */}
        {opportunity.engagement.isNew && (
          <div className="absolute bottom-3 left-3">
            <span className="px-2 py-0.5 rounded bg-primary text-white text-[8px] font-extrabold uppercase tracking-widest shadow-md">NEW</span>
          </div>
        )}
      </div>

      {/* Copy / Details content */}
      <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
        <div className="space-y-1.5">
          <h4 className="text-xs font-bold text-text-primary group-hover:text-primary transition-colors tracking-tight line-clamp-1 leading-snug">
            {opportunity.title}
          </h4>
          <p className="text-[11px] text-text-secondary leading-relaxed font-medium line-clamp-2">
            {opportunity.description}
          </p>
        </div>

        {/* Metadata Details row */}
        <div className="grid grid-cols-2 gap-2 text-[10px] font-semibold text-text-tertiary border-y border-border/50 py-2.5">
          <div className="flex items-center gap-1">
            <Clock size={11} className="text-primary-bright" />
            <span>{formatEstimatedTime(opportunity.metadata.estimatedTime)}</span>
          </div>
          <div className="flex items-center gap-1">
            <ShieldCheck size={11} className="text-success" />
            <span className="capitalize">{opportunity.metadata.verificationType === 'proof' ? 'manual review' : 'instant auto'}</span>
          </div>
        </div>

        {/* Footer actions & Rewards */}
        <div className="flex items-center justify-between pt-1">
          <div className="space-y-0.5">
            <div className="flex items-baseline gap-1">
              <span className="text-base font-black text-emerald-500 font-mono">
                +{opportunity.reward.points.toLocaleString()}
              </span>
              <span className="text-[8px] font-bold text-text-tertiary uppercase font-mono">PTS</span>
            </div>
            <span className="text-[9px] text-text-tertiary font-mono block">
              +{opportunity.reward.xp} XP
            </span>
          </div>

          <div>
            {isCompleted && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-success/10 border border-success/20 text-success text-[9px] font-bold">
                <CheckCircle2 size={11} /> Completed
              </span>
            )}
            {isPending && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-warning/10 border border-warning/20 text-warning text-[9px] font-bold">
                <AlertCircle size={11} /> Pending
              </span>
            )}
            {isCooldown && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-background border border-border text-text-tertiary text-[9px] font-bold">
                Cooldown
              </span>
            )}
            {isLocked && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-background border border-border text-text-tertiary text-[9px] font-bold">
                <Lock size={11} /> Locked
              </span>
            )}
            {status === 'available' && (
              <span className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-primary/10 border border-primary/20 text-primary text-[9px] font-black uppercase tracking-wider group-hover:bg-primary group-hover:text-white transition-all shadow-sm">
                Unlock <ChevronRight size={11} />
              </span>
            )}
          </div>
        </div>

        {/* Muted affiliate provider label */}
        {showProviderBadge && opportunity.providerName && (
          <p className="text-[7.5px] font-mono font-bold text-text-tertiary/60 uppercase tracking-widest pt-1">
            via {opportunity.providerName}
          </p>
        )}
      </div>
    </motion.div>
  );
};

export default OpportunityCard;
