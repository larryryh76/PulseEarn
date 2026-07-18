/**
 * Empty States
 * 
 * Part 1 Foundation: Beautiful illustrations, helpful copy, and action buttons.
 * Never display plain text like "No Results Found".
 * 
 * Empty states should:
 * - Feel premium and intentional
 * - Provide helpful guidance
 * - Offer clear next steps
 * - Maintain the brand feel
 */

import React from 'react';
import { motion } from 'framer-motion';
import { 
  Sparkles, 
  Search, 
  Compass, 
  Clock, 
  Trophy,
  Gift,
  Star,
  ArrowRight,
  RefreshCw
} from 'lucide-react';
import { cn } from '../../utils';

// ─── Empty State Variants ──────────────────────────────────────────────────

export type EmptyStateVariant = 
  | 'no_opportunities'
  | 'no_results'
  | 'no_category'
  | 'no_history'
  | 'no_predictions'
  | 'no_referrals'
  | 'coming_soon'
  | 'check_back';

// ─── Component ─────────────────────────────────────────────────────────────

interface EmptyStateProps {
  variant?: EmptyStateVariant;
  title?: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
  className?: string;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  variant = 'no_opportunities',
  title,
  description,
  actionLabel,
  onAction,
  className,
}) => {
  const config = getEmptyStateConfig(variant);
  
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
      className={cn(
        'flex flex-col items-center justify-center text-center py-16 px-6',
        className
      )}
    >
      {/* Illustration */}
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ delay: 0.1, duration: 0.4 }}
        className="relative mb-6"
      >
        <EmptyStateIllustration variant={variant} />
        
        {/* Floating particles */}
        {[...Array(4)].map((_, i) => (
          <motion.div
            key={i}
            animate={{
              y: [-10, 10, -10],
              opacity: [0.3, 0.6, 0.3],
            }}
            transition={{
              duration: 2 + i * 0.3,
              repeat: Infinity,
              delay: i * 0.2,
            }}
            className={cn(
              'absolute w-1.5 h-1.5 rounded-full',
              i % 2 === 0 ? 'bg-primary' : 'bg-amber-400'
            )}
            style={{
              left: `${20 + i * 20}%`,
              top: `${30 + (i % 2) * 30}%`,
            }}
          />
        ))}
      </motion.div>

      {/* Content */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="space-y-3 max-w-sm"
      >
        {/* Badge */}
        {config.badge && (
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/10 border border-primary/20">
            <config.icon size={12} className="text-primary" />
            <span className="text-[9px] font-bold uppercase tracking-widest text-primary">
              {config.badge}
            </span>
          </div>
        )}

        {/* Title */}
        <h3 className="text-lg font-bold text-text-primary">
          {title || config.title}
        </h3>

        {/* Description */}
        <p className="text-sm text-text-secondary leading-relaxed">
          {description || config.description}
        </p>

        {/* Action Button */}
        {actionLabel && onAction && (
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={onAction}
            className={cn(
              'inline-flex items-center gap-2 mt-4 px-6 py-3 rounded-xl',
              'bg-primary text-white font-bold text-sm',
              'hover:bg-primary-bright transition-colors',
              'shadow-lg shadow-primary/25'
            )}
          >
            {actionLabel}
            <ArrowRight size={14} />
          </motion.button>
        )}
      </motion.div>

      {/* Decorative gradient */}
      <div className="absolute inset-0 -z-10 overflow-hidden pointer-events-none">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[300px] h-[300px] bg-primary/5 rounded-full blur-[100px]" />
      </div>
    </motion.div>
  );
};

// ─── Illustration Component ────────────────────────────────────────────────

const EmptyStateIllustration: React.FC<{ variant: EmptyStateVariant }> = ({ variant }) => {
  const illustrations: Record<EmptyStateVariant, React.ReactNode> = {
    no_opportunities: (
      <div className="relative w-24 h-24">
        {/* Main container */}
        <div className="absolute inset-0 rounded-3xl bg-gradient-to-br from-primary/20 to-purple-500/20 border border-primary/20 flex items-center justify-center">
          <Compass size={40} className="text-primary/60" />
        </div>
        {/* Decorative rings */}
        <div className="absolute inset-0 rounded-3xl border border-dashed border-primary/20 animate-pulse" />
        {/* Sparkle */}
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 20, repeat: Infinity, ease: 'linear' }}
          className="absolute -top-1 -right-1"
        >
          <Star size={16} className="text-amber-400" />
        </motion.div>
      </div>
    ),
    
    no_results: (
      <div className="relative w-24 h-24">
        <div className="absolute inset-0 rounded-3xl bg-gradient-to-br from-amber-500/20 to-orange-500/20 border border-amber-500/20 flex items-center justify-center">
          <Search size={40} className="text-amber-500/60" />
        </div>
        <div className="absolute -bottom-1 -right-1 w-8 h-8 rounded-xl bg-surface border border-border flex items-center justify-center">
          <RefreshCw size={14} className="text-text-tertiary" />
        </div>
      </div>
    ),
    
    no_category: (
      <div className="relative w-24 h-24">
        <div className="absolute inset-0 rounded-3xl bg-gradient-to-br from-purple-500/20 to-pink-500/20 border border-purple-500/20 flex items-center justify-center">
          <Sparkles size={40} className="text-purple-500/60" />
        </div>
      </div>
    ),
    
    no_history: (
      <div className="relative w-24 h-24">
        <div className="absolute inset-0 rounded-3xl bg-gradient-to-br from-cyan-500/20 to-blue-500/20 border border-cyan-500/20 flex items-center justify-center">
          <Clock size={40} className="text-cyan-500/60" />
        </div>
      </div>
    ),
    
    no_predictions: (
      <div className="relative w-24 h-24">
        <div className="absolute inset-0 rounded-3xl bg-gradient-to-br from-emerald-500/20 to-teal-500/20 border border-emerald-500/20 flex items-center justify-center">
          <Trophy size={40} className="text-emerald-500/60" />
        </div>
      </div>
    ),
    
    no_referrals: (
      <div className="relative w-24 h-24">
        <div className="absolute inset-0 rounded-3xl bg-gradient-to-br from-pink-500/20 to-rose-500/20 border border-pink-500/20 flex items-center justify-center">
          <Gift size={40} className="text-pink-500/60" />
        </div>
      </div>
    ),
    
    coming_soon: (
      <div className="relative w-24 h-24">
        <div className="absolute inset-0 rounded-3xl bg-gradient-to-br from-violet-500/20 to-indigo-500/20 border border-violet-500/20 flex items-center justify-center">
          <Sparkles size={40} className="text-violet-500/60" />
        </div>
        <motion.div
          animate={{ scale: [1, 1.1, 1] }}
          transition={{ duration: 2, repeat: Infinity }}
          className="absolute inset-0 rounded-3xl border-2 border-violet-500/30"
        />
      </div>
    ),
    
    check_back: (
      <div className="relative w-24 h-24">
        <div className="absolute inset-0 rounded-3xl bg-gradient-to-br from-blue-500/20 to-cyan-500/20 border border-blue-500/20 flex items-center justify-center">
          <Clock size={40} className="text-blue-500/60" />
        </div>
        <motion.div
          animate={{ rotate: -360 }}
          transition={{ duration: 30, repeat: Infinity, ease: 'linear' }}
          className="absolute inset-2 rounded-2xl border border-dashed border-blue-500/20"
        />
      </div>
    ),
  };

  return illustrations[variant] || illustrations.no_opportunities;
};

// ─── Configuration ─────────────────────────────────────────────────────────

interface EmptyStateConfig {
  icon: React.ComponentType<{ size?: number; className?: string }>;
  badge?: string;
  title: string;
  description: string;
}

function getEmptyStateConfig(variant: EmptyStateVariant): EmptyStateConfig {
  const configs: Record<EmptyStateVariant, EmptyStateConfig> = {
    no_opportunities: {
      icon: Compass,
      badge: 'Discover',
      title: 'Start Your Journey',
      description: 'No opportunities available right now. Check back soon for new ways to earn!',
    },
    no_results: {
      icon: Search,
      title: 'No Results Found',
      description: 'Try adjusting your search or filters to find what you\'re looking for.',
    },
    no_category: {
      icon: Sparkles,
      title: 'Nothing Here Yet',
      description: 'This category is empty. Explore other sections or check back later.',
    },
    no_history: {
      icon: Clock,
      badge: 'History',
      title: 'No Activity Yet',
      description: 'Your completed opportunities will appear here. Start earning!',
    },
    no_predictions: {
      icon: Trophy,
      badge: 'Predict',
      title: 'No Active Markets',
      description: 'Prediction markets are coming soon. Be the first to try when they launch!',
    },
    no_referrals: {
      icon: Gift,
      badge: 'Refer',
      title: 'Share & Earn',
      description: 'Invite friends to earn bonus points. Share your referral code!',
    },
    coming_soon: {
      icon: Sparkles,
      badge: 'New',
      title: 'Coming Soon',
      description: 'We\'re working on something exciting. Stay tuned!',
    },
    check_back: {
      icon: Clock,
      title: 'Check Back Soon',
      description: 'New opportunities are added regularly. Refresh to see the latest!',
    },
  };

  return configs[variant];
}

// ─── Compact Empty State ───────────────────────────────────────────────────

interface CompactEmptyStateProps {
  message: string;
  className?: string;
}

export const CompactEmptyState: React.FC<CompactEmptyStateProps> = ({
  message,
  className,
}) => (
  <div 
    className={cn(
      'flex items-center justify-center py-12 px-6',
      className
    )}
  >
    <div className="flex items-center gap-3 text-text-tertiary">
      <Compass size={16} className="opacity-50" />
      <span className="text-sm font-medium">{message}</span>
    </div>
  </div>
);

export default EmptyState;
