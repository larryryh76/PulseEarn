import React, { useEffect } from 'react';
import { motion } from 'framer-motion';
import { Zap, Clock, Info, CheckCircle2, Lock, ArrowUpRight, X, Layers } from 'lucide-react';
import { MarketplaceOpportunity, DIFFICULTY_CONFIG } from '../../types/marketplace';
import { getCanonicalStatus } from './MarketplaceOpportunityCard';

interface MarketplaceOpportunityDrawerProps {
  opportunity: MarketplaceOpportunity;
  userTaskStatus?: string;
  onClose: () => void;
  onAction: () => void;
}

export const MarketplaceOpportunityDrawer: React.FC<MarketplaceOpportunityDrawerProps> = ({
  opportunity,
  userTaskStatus,
  onClose,
  onAction,
}) => {
  const diffConfig = DIFFICULTY_CONFIG[opportunity.metadata.difficulty] || DIFFICULTY_CONFIG.medium;
  const canonicalStatus = getCanonicalStatus(userTaskStatus || opportunity.status);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    document.body.style.overflow = 'hidden';

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
    };
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-[200] flex justify-end" role="dialog" aria-modal="true" aria-label={opportunity.title}>
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="absolute inset-0 bg-background/80 backdrop-blur-sm"
      />

      {/* Drawer Panel */}
      <motion.div
        initial={{ x: '100%' }}
        animate={{ x: 0 }}
        exit={{ x: '100%' }}
        transition={{ type: 'spring', damping: 30, stiffness: 300 }}
        className="relative w-full max-w-lg bg-surface border-l border-border shadow-2xl flex flex-col h-full overflow-hidden"
      >
        {/* Drawer Header */}
        <div className="p-5 border-b border-border flex items-center justify-between bg-surface-bright/50 shrink-0">
          <div className="flex items-center gap-3 min-w-0 pr-2">
            <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary shrink-0">
              <Zap size={20} />
            </div>
            <div className="min-w-0">
              <span className="text-[10px] font-bold uppercase tracking-wider text-text-tertiary block font-mono">
                Opportunity Specs
              </span>
              <h2 className="text-sm font-bold text-text-primary tracking-tight truncate">{opportunity.title}</h2>
            </div>
          </div>
          <button onClick={onClose} aria-label="Close details" className="p-2 hover:bg-surface-bright rounded-xl text-text-tertiary transition-colors shrink-0">
            <X size={18} />
          </button>
        </div>

        {/* Drawer Content */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          {/* Rewards Grid */}
          <section className="grid grid-cols-2 gap-3">
            <div className="p-4 rounded-2xl bg-surface-bright border border-border">
              <span className="text-[9px] font-bold uppercase tracking-wider text-text-tertiary block font-mono">
                Reward Value
              </span>
              <div className="flex items-baseline gap-1 mt-1">
                <span className="text-2xl font-black text-success tabular-nums">+{opportunity.reward.points}</span>
                <span className="text-[10px] font-bold text-text-tertiary uppercase">PTS</span>
              </div>
            </div>
            <div className="p-4 rounded-2xl bg-surface-bright border border-border">
              <span className="text-[9px] font-bold uppercase tracking-wider text-text-tertiary block font-mono">
                Progression
              </span>
              <div className="flex items-baseline gap-1 mt-1">
                <span className="text-2xl font-black text-primary tabular-nums">+{opportunity.reward.xp}</span>
                <span className="text-[10px] font-bold text-text-tertiary uppercase">XP</span>
              </div>
            </div>
          </section>

          {/* Key Metadata Overview */}
          <section className="space-y-3 p-4 rounded-2xl bg-surface-bright/40 border border-border">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-wider text-primary flex items-center gap-1 font-mono">
                <Layers size={12} />
                <span>Overview & Specs</span>
              </span>
              <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-surface border border-border text-text-secondary font-mono">
                {opportunity.providerName || (opportunity.source === 'provider' ? 'Partner Offer' : 'PulseEarn')}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs">
              {opportunity.metadata.estimatedTime && (
                <div className="p-2.5 rounded-xl bg-surface border border-border">
                  <span className="text-[9px] text-text-tertiary block uppercase font-mono">Estimated Time</span>
                  <span className="font-semibold text-text-primary">{opportunity.metadata.estimatedTime}</span>
                </div>
              )}
              {opportunity.metadata.difficulty && (
                <div className="p-2.5 rounded-xl bg-surface border border-border">
                  <span className="text-[9px] text-text-tertiary block uppercase font-mono">Difficulty</span>
                  <span className="font-semibold" style={{ color: diffConfig.color }}>
                    {diffConfig.label}
                  </span>
                </div>
              )}
              {opportunity.metadata.category && (
                <div className="p-2.5 rounded-xl bg-surface border border-border">
                  <span className="text-[9px] text-text-tertiary block uppercase font-mono">Category</span>
                  <span className="font-semibold text-text-primary capitalize">{opportunity.metadata.category}</span>
                </div>
              )}
              {opportunity.metadata.verificationType && (
                <div className="p-2.5 rounded-xl bg-surface border border-border">
                  <span className="text-[9px] text-text-tertiary block uppercase font-mono">Verification</span>
                  <span className="font-semibold text-text-primary capitalize">
                    {opportunity.metadata.verificationType === 'automated' ||
                    opportunity.metadata.verificationType === 'api' ||
                    opportunity.metadata.verificationType === 'offerwall'
                      ? 'Automated'
                      : 'Manual Verification'}
                  </span>
                </div>
              )}
            </div>
          </section>

          {/* Instructions & Steps */}
          {(opportunity.instructions || opportunity.description) && (
            <section className="space-y-2 p-4 rounded-2xl bg-surface-bright/40 border border-border">
              <span className="text-[10px] font-bold uppercase tracking-wider text-text-secondary block font-mono">
                Requirements & Instructions
              </span>
              <p className="text-xs text-text-secondary leading-relaxed pt-1">
                {opportunity.instructions || opportunity.description}
              </p>
            </section>
          )}

          {/* Support / Help Notice */}
          <div className="p-3 rounded-xl bg-surface border border-border flex items-center justify-between text-xs text-text-tertiary">
            <span className="flex items-center gap-1.5">
              <Info size={14} className="text-text-tertiary shrink-0" />
              Need help with this opportunity?
            </span>
            <a href="/support" className="text-primary font-bold hover:underline">
              Support
            </a>
          </div>
        </div>

        {/* Footer Action CTA */}
        <div className="p-4 border-t border-border bg-surface-bright/50 shrink-0">
          {canonicalStatus.label === 'Completed' ? (
            <button
              disabled
              className="w-full py-3 px-4 rounded-xl bg-success/10 border border-success/20 text-success text-xs font-bold flex items-center justify-center gap-2 cursor-not-allowed min-h-[44px]"
            >
              <CheckCircle2 size={16} />
              <span>Opportunity Completed</span>
            </button>
          ) : canonicalStatus.label === 'Pending Review' ? (
            <button
              disabled
              className="w-full py-3 px-4 rounded-xl bg-warning/10 border border-warning/20 text-warning text-xs font-bold flex items-center justify-center gap-2 cursor-not-allowed min-h-[44px]"
            >
              <Clock size={16} />
              <span>Verification Pending</span>
            </button>
          ) : !canonicalStatus.isActionable ? (
            <button
              disabled
              className="w-full py-3 px-4 rounded-xl bg-surface-bright border border-border text-text-tertiary text-xs font-bold flex items-center justify-center gap-2 cursor-not-allowed min-h-[44px]"
            >
              <Lock size={16} />
              <span>{canonicalStatus.label}</span>
            </button>
          ) : (
            <button
              onClick={() => {
                onAction();
                onClose();
              }}
              className="w-full py-3 px-4 rounded-xl bg-primary hover:bg-primary-hover text-white text-xs font-bold transition-all flex items-center justify-center gap-2 shadow-lg shadow-primary/10 min-h-[44px]"
            >
              <span>{canonicalStatus.ctaText === 'Continue' ? 'Continue Opportunity' : 'Start Opportunity'}</span>
              <ArrowUpRight size={15} />
            </button>
          )}
        </div>
      </motion.div>
    </div>
  );
};
