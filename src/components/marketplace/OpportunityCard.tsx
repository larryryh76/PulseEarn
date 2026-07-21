/**
 * OpportunityCard
 * 
 * Unified card component for displaying all opportunity types
 * (internal and provider) in the PulseEarn Marketplace.
 * 
 * Features:
 * - Premium Apple App Store & Steam Store visual layout
 * - Artwork/Gradient dominant design
 * - Standardized 24px rounded borders
 * - Multi-layer shadows, interactive glows, and lift micro-animations
 * - Display of requirements, verification type, reward & XP
 * - Non-dominant subtle "Powered by" branding
 * - Distinctive completion states
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
  ShieldCheck,
  BarChart3,
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

// ─── Helper Components & Utilities ───────────────────────────────────────────

function getCategoryGradient(category: string): string {
  const gradients: Record<string, string> = {
    featured: 'from-blue-600/40 via-indigo-600/20 to-purple-600/40',
    daily: 'from-rose-500/40 via-orange-500/20 to-amber-500/40',
    surveys: 'from-emerald-500/40 via-teal-500/20 to-cyan-500/40',
    games: 'from-yellow-500/40 via-red-500/20 to-purple-500/40',
    apps: 'from-violet-500/40 via-fuchsia-500/20 to-blue-500/40',
    shopping: 'from-amber-500/40 via-orange-500/20 to-pink-500/40',
    cashback: 'from-cyan-500/40 via-teal-500/20 to-emerald-500/40',
    videos: 'from-pink-500/40 via-purple-500/20 to-indigo-500/40',
    learn: 'from-lime-500/40 via-emerald-500/20 to-teal-500/40',
    community: 'from-blue-500/40 via-indigo-500/20 to-violet-500/40',
    referrals: 'from-rose-500/40 via-pink-500/20 to-indigo-500/40',
    predictions: 'from-indigo-500/40 via-purple-500/20 to-pink-500/40',
    seasonal: 'from-purple-500/40 via-rose-500/20 to-amber-500/40',
    sponsored: 'from-blue-500/40 via-emerald-500/20 to-cyan-500/40',
  };
  return gradients[category] || 'from-blue-600/30 to-purple-600/30';
}

const CategoryIcon: React.FC<{ category: string; className?: string; size?: number }> = ({ category, className, size = 16 }) => {
  switch (category) {
    case 'featured': return <Sparkles className={className} size={size} />;
    case 'daily': return <Flame className={className} size={size} />;
    case 'surveys': return <BarChart3 className={className} size={size} />;
    case 'games': return <Trophy className={className} size={size} />;
    case 'apps': return <Smartphone className={className} size={size} />;
    case 'shopping': return <ShoppingBag className={className} size={size} />;
    case 'cashback': return <CreditCard className={className} size={size} />;
    case 'videos': return <Play className={className} size={size} />;
    case 'learn': return <GraduationCap className={className} size={size} />;
    case 'community': return <Users className={className} size={size} />;
    case 'referrals': return <UserPlus className={className} size={size} />;
    case 'predictions': return <TrendingUp className={className} size={size} />;
    case 'seasonal': return <Gift className={className} size={size} />;
    case 'sponsored': return <Star className={className} size={size} />;
    default: return <Compass className={className} size={size} />;
  }
};

function formatCategory(category: string): string {
  return category
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

// ─── Main OpportunityCard Component ──────────────────────────────────────────

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
          className={className}
        />
      );
  }
};

// ─── Card Properties Interface ────────────────────────────────────────────────

interface CardProps {
  opportunity: MarketplaceOpportunity;
  status: 'available' | 'completed' | 'pending' | 'cooldown' | 'locked';
  difficulty: { label: string; color: string; bgColor: string };
  showProviderBadge: boolean;
  showXP: boolean;
  onOpen: () => void;
  onKeyDown: (e: React.KeyboardEvent) => void;
  className?: string;
}

// ─── Default Card Component ──────────────────────────────────────────────────

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
  const hasArtwork = opportunity.metadata.artwork || opportunity.metadata.thumbnail;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      whileHover={status !== 'locked' ? { y: -6, scale: 1.015 } : {}}
      whileTap={status !== 'locked' ? { scale: 0.985 } : {}}
      transition={{ type: 'spring', stiffness: 350, damping: 25 }}
      className={cn(
        'group relative rounded-[24px] border border-border bg-surface overflow-hidden',
        'transition-all duration-350 cursor-pointer shadow-premium hover:shadow-[0_20px_50px_rgba(0,112,255,0.12)]',
        status === 'locked'
          ? 'border-border/50 opacity-40 cursor-not-allowed'
          : 'hover:border-primary/45',
        className
      )}
      onClick={onOpen}
      onKeyDown={onKeyDown}
      tabIndex={status === 'locked' ? -1 : 0}
      role="button"
      aria-label={`Open ${opportunity.title}`}
    >
      {/* 1. Artwork Section (Dominates the view) */}
      <div className="relative h-44 w-full overflow-hidden bg-surface-glass border-b border-border-bright">
        {hasArtwork ? (
          <img
            src={opportunity.metadata.artwork || opportunity.metadata.thumbnail}
            alt={opportunity.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700 ease-out"
            referrerPolicy="no-referrer"
          />
        ) : (
          <div className={cn(
            'w-full h-full bg-gradient-to-br transition-all duration-700 ease-out flex items-center justify-center relative',
            getCategoryGradient(opportunity.metadata.category)
          )}>
            <div className="absolute inset-0 bg-black/10 backdrop-blur-[0.5px]" />
            <CategoryIcon category={opportunity.metadata.category} className="text-white/30 drop-shadow-xl" size={48} />
          </div>
        )}

        {/* Dynamic Category & Difficulty pill overlays */}
        <div className="absolute top-4 left-4 right-4 flex items-center justify-between z-10">
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-black/65 backdrop-blur-md border border-white/10 shadow-lg">
            <CategoryIcon category={opportunity.metadata.category} className="text-primary" size={11} />
            <span className="text-[9px] font-black uppercase tracking-wider text-text-primary">
              {formatCategory(opportunity.metadata.category)}
            </span>
          </div>

          <span
            className="px-2.5 py-1 rounded-xl text-[8px] font-black uppercase tracking-widest shadow-lg border border-white/5"
            style={{
              backgroundColor: difficulty.bgColor,
              color: difficulty.color,
            }}
          >
            {difficulty.label}
          </span>
        </div>

        {/* Floating Badges */}
        {opportunity.engagement.isNew && status === 'available' && (
          <div className="absolute bottom-4 left-4 z-10">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-blue-500 text-white text-[8px] font-black uppercase tracking-wider shadow-lg shadow-blue-500/30">
              <Sparkles size={9} /> NEW
            </span>
          </div>
        )}
        {opportunity.engagement.trending && status === 'available' && !opportunity.engagement.isNew && (
          <div className="absolute bottom-4 left-4 z-10">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-orange-500 text-white text-[8px] font-black uppercase tracking-wider shadow-lg shadow-orange-500/30">
              <TrendingUp size={9} /> TRENDING
            </span>
          </div>
        )}
      </div>

      {/* 2. Detailed Metadata & Copy Area */}
      <div className="p-6 space-y-4">
        {/* Title & Desc */}
        <div className="space-y-1.5">
          <h3 className="text-sm font-black text-text-primary group-hover:text-primary transition-colors line-clamp-1 leading-snug tracking-tight">
            {opportunity.title}
          </h3>
          <p className="text-xs text-text-tertiary line-clamp-2 leading-relaxed font-medium">
            {opportunity.description}
          </p>
        </div>

        {/* Verification Type & Estimated Time Row */}
        <div className="grid grid-cols-2 gap-2 text-text-tertiary text-[10px] font-semibold border-y border-white/5 py-3">
          <div className="flex items-center gap-1.5">
            <Clock size={12} className="text-primary-bright" />
            <span>{opportunity.metadata.estimatedTime}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <ShieldCheck size={12} className="text-emerald-400" />
            <span className="capitalize">{opportunity.metadata.verificationType} verification</span>
          </div>
        </div>

        {/* Requirements field - if present */}
        {opportunity.requirements && (
          <div className="rounded-xl bg-surface-glass-hover/40 border border-border-bright p-2.5">
            <p className="text-[9px] text-text-secondary leading-snug font-medium line-clamp-1">
              <span className="font-bold uppercase tracking-wider text-primary text-[8px] mr-1">Req:</span>
              {opportunity.requirements}
            </p>
          </div>
        )}

        {/* 3. Footer: Reward Payload & Completion Action Button */}
        <div className="flex items-center justify-between pt-1">
          <div className="space-y-0.5">
            <div className="flex items-baseline gap-1">
              <span className="text-xl font-black text-emerald-400 tabular-nums">
                +{opportunity.reward.points.toLocaleString()}
              </span>
              <span className="text-[9px] font-black text-text-tertiary uppercase">PTS</span>
            </div>
            {showXP && (
              <span className="text-[9px] font-bold text-text-tertiary block">
                +{opportunity.reward.xp} XP
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            {/* Status indicators */}
            {status === 'completed' && (
              <div className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[10px] font-bold">
                <CheckCircle2 size={12} />
                <span>Claimed</span>
              </div>
            )}
            {status === 'pending' && (
              <div className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-warning/10 border border-warning/20 text-warning text-[10px] font-bold">
                <AlertCircle size={12} />
                <span>Pending</span>
              </div>
            )}
            {status === 'cooldown' && (
              <div className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-white/5 border border-white/10 text-text-tertiary text-[10px] font-bold">
                <Flame size={12} />
                <span>Cooldown</span>
              </div>
            )}
            {status === 'locked' && (
              <div className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-white/5 border border-white/10 text-text-tertiary text-[10px] font-bold">
                <Lock size={12} />
                <span>Locked</span>
              </div>
            )}
            
            {/* Interactive CTA */}
            {status === 'available' && (
              <div className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-primary/10 border border-primary/20 text-primary font-black text-[10px] uppercase tracking-wider group-hover:bg-primary group-hover:text-white group-hover:border-primary transition-all shadow-md group-hover:shadow-primary/25">
                <span>Unlock</span>
                <ArrowUpRight size={12} />
              </div>
            )}
          </div>
        </div>

        {/* 4. Non-dominant subtle "Powered by" label */}
        {showProviderBadge && opportunity.providerName && (
          <div className="pt-2 flex justify-start">
            <span className="text-[8px] text-text-tertiary/60 font-bold uppercase tracking-widest">
              Powered by {opportunity.providerName}
            </span>
          </div>
        )}
      </div>
    </motion.div>
  );
};

// ─── Compact Card Component ─────────────────────────────────────────────────

const CompactCard: React.FC<CardProps> = ({
  opportunity,
  status,
  showProviderBadge,
  showXP,
  onOpen,
  onKeyDown,
  className,
}) => {
  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      whileHover={status !== 'locked' ? { y: -4, scale: 1.02 } : {}}
      transition={{ type: 'spring', stiffness: 400, damping: 25 }}
      className={cn(
        'group relative rounded-2xl border border-border bg-surface p-4.5',
        'transition-all duration-300 cursor-pointer shadow-premium hover:shadow-[0_15px_35px_rgba(0,112,255,0.08)]',
        status === 'locked'
          ? 'border-border opacity-40 cursor-not-allowed'
          : 'hover:border-primary/40',
        className
      )}
      onClick={onOpen}
      onKeyDown={onKeyDown}
      tabIndex={status === 'locked' ? -1 : 0}
      role="button"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0 space-y-1">
          <div className="flex items-center gap-1 text-[8px] font-bold uppercase tracking-widest text-text-tertiary">
            <CategoryIcon category={opportunity.metadata.category} className="text-text-tertiary shrink-0" size={10} />
            <span>{formatCategory(opportunity.metadata.category)}</span>
          </div>
          <h4 className="text-xs font-black text-text-primary group-hover:text-primary transition-colors line-clamp-1 mt-0.5 leading-tight tracking-tight">
            {opportunity.title}
          </h4>
        </div>
        <div className="p-2 rounded-xl bg-primary/10 border border-primary/20 text-primary group-hover:bg-primary group-hover:text-white group-hover:shadow-lg group-hover:shadow-primary/20 transition-all shrink-0">
          <ChevronRight size={12} />
        </div>
      </div>

      <div className="flex items-center justify-between mt-4 pt-3 border-t border-white/5 text-[10px] font-bold">
        <div>
          <span className="text-sm font-black text-emerald-400">+{opportunity.reward.points.toLocaleString()}</span>
          {showXP && (
            <span className="text-[8px] text-text-tertiary font-bold ml-1">+{opportunity.reward.xp} XP</span>
          )}
        </div>
        <span className="text-text-tertiary font-semibold">{opportunity.metadata.estimatedTime}</span>
      </div>

      {showProviderBadge && opportunity.providerName && (
        <span className="text-[7px] text-text-tertiary/50 font-bold uppercase tracking-widest mt-2 block">
          Powered by {opportunity.providerName}
        </span>
      )}
    </motion.div>
  );
};

// ─── Featured Card Component ─────────────────────────────────────────────────

const FeaturedCard: React.FC<CardProps> = ({
  opportunity,
  status,
  showXP,
  onOpen,
  onKeyDown,
  className,
}) => {
  const hasArtwork = opportunity.metadata.artwork || opportunity.metadata.thumbnail;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={status !== 'locked' ? { y: -8, scale: 1.015 } : {}}
      transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
      className={cn(
        'group relative rounded-[28px] border border-white/10 bg-gradient-to-br from-[#12121D] to-[#08080C] overflow-hidden',
        'transition-all duration-400 cursor-pointer shadow-premium hover:shadow-[0_30px_60px_rgba(0,112,255,0.18)]',
        status === 'locked'
          ? 'opacity-40 cursor-not-allowed'
          : 'hover:border-primary/40',
        className
      )}
      onClick={onOpen}
      onKeyDown={onKeyDown}
      tabIndex={status === 'locked' ? -1 : 0}
      role="button"
    >
      {/* Immersive glowing radial background spotlights */}
      <div className="absolute top-0 right-0 w-56 h-56 bg-primary/10 rounded-full blur-[80px] group-hover:bg-primary/20 transition-colors duration-500" />
      <div className="absolute bottom-0 left-0 w-44 h-44 bg-accent/5 rounded-full blur-[60px]" />

      {/* Decorative noise background texture */}
      <div 
        className="absolute inset-0 opacity-15 mix-blend-overlay pointer-events-none"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`,
        }}
      />

      <div className="relative p-7 space-y-6 min-h-[250px] flex flex-col justify-between z-10">
        {/* Card Top */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1 px-3 py-1 rounded-xl bg-primary/20 border border-primary/45 text-primary text-[8px] font-black uppercase tracking-widest">
                <Sparkles size={8} /> FEATURED
              </span>
              <span className="text-[9px] text-text-tertiary font-bold uppercase tracking-wider">
                {formatCategory(opportunity.metadata.category)}
              </span>
            </div>

            {opportunity.providerName && (
              <span className="text-[8px] text-text-tertiary/65 font-bold uppercase tracking-widest">
                Powered by {opportunity.providerName}
              </span>
            )}
          </div>

          <div className="flex gap-4 items-start">
            {hasArtwork && (
              <img
                src={opportunity.metadata.artwork || opportunity.metadata.thumbnail}
                alt={opportunity.title}
                className="w-14 h-14 rounded-2xl object-cover border border-white/10 shadow-lg shrink-0 group-hover:scale-105 transition-transform duration-500"
                referrerPolicy="no-referrer"
              />
            )}
            <div className="space-y-1">
              <h3 className="text-base font-black text-white group-hover:text-primary transition-colors leading-tight tracking-tight">
                {opportunity.title}
              </h3>
              <p className="text-xs text-text-tertiary leading-relaxed font-medium line-clamp-2">
                {opportunity.description}
              </p>
            </div>
          </div>
        </div>

        {/* Dynamic Requirements/Verification if available */}
        {(opportunity.requirements || opportunity.metadata.verificationType) && (
          <div className="grid grid-cols-2 gap-3 text-[10px] font-semibold border-t border-white/5 pt-4">
            <div className="flex items-center gap-1.5 text-text-tertiary">
              <Clock size={12} className="text-primary-bright" />
              <span>{opportunity.metadata.estimatedTime}</span>
            </div>
            <div className="flex items-center gap-1.5 text-text-tertiary">
              <ShieldCheck size={12} className="text-emerald-400" />
              <span className="capitalize">{opportunity.metadata.verificationType} verification</span>
            </div>
          </div>
        )}

        {/* Card Footer */}
        <div className="flex items-end justify-between pt-4 border-t border-white/5">
          <div>
            <span className="text-[9px] font-bold text-text-tertiary uppercase tracking-widest block">
              Ecosystem Payload
            </span>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-2xl font-black text-emerald-400">
                +{opportunity.reward.points.toLocaleString()}
              </span>
              <span className="text-xs font-black text-text-tertiary uppercase">PTS</span>
            </div>
            {showXP && (
              <span className="text-[10px] font-bold text-text-tertiary mt-0.5 block">+{opportunity.reward.xp} XP</span>
            )}
          </div>

          {status === 'available' && (
            <div className="px-5 py-3 rounded-2xl bg-primary hover:bg-primary-bright text-white text-[10px] font-black uppercase tracking-wider transition-all flex items-center gap-2 shadow-lg shadow-primary/20 hover:shadow-primary/35">
              <span>Unlock Offer</span> <ArrowUpRight size={13} />
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
};

// ─── Row Card Component ──────────────────────────────────────────────────────

const RowCard: React.FC<CardProps> = ({
  opportunity,
  status,
  showXP,
  onOpen,
  onKeyDown,
  className,
}) => {
  return (
    <motion.div
      layout
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      whileHover={status !== 'locked' ? { x: 4, scale: 1.005 } : {}}
      transition={{ duration: 0.2 }}
      className={cn(
        'group flex items-center justify-between p-4 rounded-2xl border border-border bg-surface',
        'transition-all duration-300 cursor-pointer shadow-premium hover:shadow-[0_10px_25px_rgba(0,112,255,0.06)]',
        status === 'locked'
          ? 'border-border opacity-40 cursor-not-allowed'
          : 'hover:border-primary/40',
        className
      )}
      onClick={onOpen}
      onKeyDown={onKeyDown}
      tabIndex={status === 'locked' ? -1 : 0}
      role="button"
    >
      <div className="flex items-center gap-4.5 min-w-0">
        <div className={cn(
          'w-11 h-11 rounded-xl flex items-center justify-center shrink-0 border border-white/5 shadow-md',
          'bg-gradient-to-br',
          getCategoryGradient(opportunity.metadata.category)
        )}>
          <CategoryIcon category={opportunity.metadata.category} className="text-text-primary" size={16} />
        </div>
        <div className="min-w-0 space-y-1">
          <div className="flex items-center gap-2">
            <h4 className="text-xs font-black text-text-primary group-hover:text-primary transition-colors truncate tracking-tight">
              {opportunity.title}
            </h4>
            {opportunity.engagement.trending && (
              <TrendingUp size={11} className="text-orange-400 shrink-0" />
            )}
          </div>
          <p className="text-[10px] text-text-tertiary truncate leading-relaxed font-medium">
            {opportunity.description}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-4 shrink-0">
        <div className="text-right">
          <span className="text-sm font-black text-emerald-400 block leading-none">
            +{opportunity.reward.points.toLocaleString()}
          </span>
          {showXP && (
            <span className="text-[8px] font-bold text-text-tertiary block mt-1">+{opportunity.reward.xp} XP</span>
          )}
        </div>
        <div className="p-2 rounded-xl bg-primary/10 border border-primary/20 text-primary group-hover:bg-primary group-hover:text-white hover:shadow-md hover:shadow-primary/20 transition-all">
          <ChevronRight size={13} />
        </div>
      </div>
    </motion.div>
  );
};

// ─── Opportunity State Determination Hook ────────────────────────────────────

function useOpportunityState(opportunity: MarketplaceOpportunity) {
  return useMemo(() => {
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
        if (opportunity.nextAvailableAt && opportunity.nextAvailableAt > new Date()) {
          status = 'cooldown';
        }
    }

    return { opportunity, status };
  }, [opportunity]);
}

export default OpportunityCard;
