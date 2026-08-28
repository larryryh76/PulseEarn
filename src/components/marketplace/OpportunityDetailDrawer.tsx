import React, { useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  X,
  Zap,
  Clock,
  CheckCircle2,
  Lock,
  ArrowUpRight,
  ShieldCheck,
  Layers,
} from 'lucide-react';
import {
  MarketplaceOpportunity,
  DIFFICULTY_CONFIG,
} from '../../types/marketplace';
import { cn } from '../../utils';
import { formatUSD, PTS_TO_USD } from '../../utils/finance';
import { getOpportunityStatusMeta } from './OpportunityCard';

interface OpportunityDetailDrawerProps {
  opportunity: MarketplaceOpportunity;
  userTask?: { status?: string };
  onClose: () => void;
  onAction: () => void;
}

export const OpportunityDetailDrawer: React.FC<OpportunityDetailDrawerProps> = ({
  opportunity,
  userTask,
  onClose,
  onAction,
}) => {
  const diffConfig =
    DIFFICULTY_CONFIG[opportunity.metadata?.difficulty] || DIFFICULTY_CONFIG.medium;
  const statusMeta = getOpportunityStatusMeta(userTask?.status || opportunity.status);
  const providerName =
    opportunity.providerName || (opportunity.source === 'provider' ? 'Partner Offer' : 'PulseEarn');

  const pts = opportunity.reward?.points ?? 0;
  const xp = opportunity.reward?.xp ?? 0;
  const usdValue = formatUSD(PTS_TO_USD(pts));
  const timeEst = opportunity.metadata?.estimatedTime || '~5 min';

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    document.body.style.overflow = 'hidden';

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
    };
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-[200] flex justify-end"
      role="dialog"
      aria-modal="true"
      aria-label={opportunity.title}
    >
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
        className="relative w-full max-w-lg bg-surface border-l border-border shadow-2xl flex flex-col h-full overflow-hidden z-10"
      >
        {/* Drawer Header */}
        <div className="p-5 md:p-6 border-b border-border flex items-center justify-between bg-surface-bright/50 shrink-0">
          <div className="flex items-center gap-3 min-w-0 pr-2">
            <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary shrink-0 shadow-xs">
              <Zap size={20} />
            </div>
            <div className="min-w-0">
              <span className="text-[10px] font-bold uppercase tracking-wider text-text-tertiary block font-mono">
                Opportunity Details
              </span>
              <h2 className="text-sm md:text-base font-bold text-text-primary tracking-tight truncate">
                {opportunity.title}
              </h2>
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Close opportunity details"
            className="p-2 hover:bg-surface-bright rounded-xl text-text-tertiary hover:text-text-primary transition-colors shrink-0 min-h-[44px] min-w-[44px] flex items-center justify-center"
          >
            <X size={18} />
          </button>
        </div>

        {/* Drawer Scrollable Body */}
        <div className="flex-1 overflow-y-auto p-5 md:p-6 space-y-6 no-scrollbar">
          {/* Main Reward Section */}
          <section className="grid grid-cols-2 gap-3">
            <div className="p-4 rounded-2xl bg-surface-bright border border-border shadow-xs">
              <span className="text-[10px] font-bold uppercase tracking-wider text-text-tertiary block font-mono">
                Verified Reward
              </span>
              <div className="flex items-baseline gap-1.5 mt-1">
                <span className="text-2xl md:text-3xl font-black text-success tabular-nums tracking-tight">
                  +{pts.toLocaleString()}
                </span>
                <span className="text-[10px] font-bold text-text-tertiary uppercase font-mono">
                  PTS
                </span>
              </div>
              <span className="text-xs font-semibold text-text-secondary mt-0.5 block">
                Estimated Value: {usdValue}
              </span>
            </div>

            <div className="p-4 rounded-2xl bg-surface-bright border border-border shadow-xs">
              <span className="text-[10px] font-bold uppercase tracking-wider text-text-tertiary block font-mono">
                Progression Bonus
              </span>
              <div className="flex items-baseline gap-1.5 mt-1">
                <span className="text-2xl md:text-3xl font-black text-primary tabular-nums tracking-tight">
                  +{xp.toLocaleString()}
                </span>
                <span className="text-[10px] font-bold text-text-tertiary uppercase font-mono">
                  XP
                </span>
              </div>
              <span className="text-xs font-semibold text-text-secondary mt-0.5 block">
                Boosts Account Level
              </span>
            </div>
          </section>

          {/* Real Status Badge */}
          <div className="p-3.5 rounded-xl bg-surface-bright/80 border border-border flex items-center justify-between">
            <span className="text-xs font-semibold text-text-secondary">Current Status:</span>
            <span
              className={cn(
                'text-xs font-bold uppercase tracking-wider px-3 py-1 rounded-lg border font-mono',
                statusMeta.badgeClass
              )}
            >
              {statusMeta.label}
            </span>
          </div>

          {/* Metadata Specs Grid */}
          <section className="space-y-3 p-4 rounded-2xl bg-surface-bright/40 border border-border">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-wider text-primary flex items-center gap-1.5 font-mono">
                <Layers size={13} />
                <span>Opportunity Specs</span>
              </span>
              <span className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-md bg-surface-bright border border-border text-text-primary font-mono flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-primary" />
                <span>{providerName}</span>
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="p-3 rounded-xl bg-surface border border-border">
                <span className="text-[9px] text-text-tertiary block uppercase font-mono mb-0.5">
                  Est. Completion Time
                </span>
                <span className="font-bold text-text-primary flex items-center gap-1">
                  <Clock size={12} className="text-text-tertiary" />
                  {timeEst}
                </span>
              </div>

              <div className="p-3 rounded-xl bg-surface border border-border">
                <span className="text-[9px] text-text-tertiary block uppercase font-mono mb-0.5">
                  Difficulty Level
                </span>
                <span className="font-bold" style={{ color: diffConfig.color }}>
                  {diffConfig.label}
                </span>
              </div>

              <div className="p-3 rounded-xl bg-surface border border-border">
                <span className="text-[9px] text-text-tertiary block uppercase font-mono mb-0.5">
                  Category
                </span>
                <span className="font-bold text-text-primary capitalize">
                  {opportunity.metadata?.category || 'General'}
                </span>
              </div>

              <div className="p-3 rounded-xl bg-surface border border-border">
                <span className="text-[9px] text-text-tertiary block uppercase font-mono mb-0.5">
                  Verification Type
                </span>
                <span className="font-bold text-text-primary capitalize">
                  {opportunity.metadata?.verificationType === 'automated' ||
                  opportunity.metadata?.verificationType === 'api' ||
                  opportunity.metadata?.verificationType === 'offerwall'
                    ? 'Automated Postback'
                    : 'System Verification'}
                </span>
              </div>
            </div>
          </section>

          {/* Compatibility / Requirements */}
          <section className="space-y-2.5 p-4 rounded-2xl bg-surface-bright/40 border border-border">
            <span className="text-[10px] font-bold uppercase tracking-wider text-text-secondary block font-mono">
              Requirements & Steps
            </span>
            <div className="text-xs text-text-secondary leading-relaxed space-y-2">
              <p>
                {opportunity.instructions ||
                  opportunity.description ||
                  'Follow the steps provided upon launching the opportunity. Once verified by the partner, your account will be automatically credited with the PTS and XP.'}
              </p>

              {opportunity.requirements && (
                <div className="p-3 rounded-xl bg-surface border border-border mt-2">
                  <span className="text-[10px] font-bold text-text-tertiary uppercase block mb-1 font-mono">
                    Special Conditions
                  </span>
                  <p className="text-xs text-text-secondary">{opportunity.requirements}</p>
                </div>
              )}
            </div>
          </section>

          {/* Trust and Safety Notice */}
          <div className="p-3.5 rounded-xl bg-surface border border-border/80 flex items-start gap-2.5 text-xs text-text-tertiary">
            <ShieldCheck size={16} className="text-success shrink-0 mt-0.5" />
            <div>
              <span className="font-semibold text-text-secondary block">
                Verified Provider Guarantee
              </span>
              <p className="text-[11px] text-text-tertiary mt-0.5 leading-normal">
                Completions are tracked through verified server-to-server callbacks and credited to your ledger upon validation.
              </p>
            </div>
          </div>
        </div>

        {/* Footer Action CTA */}
        <div className="p-5 border-t border-border bg-surface-bright/50 shrink-0">
          {statusMeta.label === 'Completed' ? (
            <button
              disabled
              className="w-full py-3 px-4 rounded-xl bg-success/10 border border-success/30 text-success text-xs font-bold flex items-center justify-center gap-2 cursor-not-allowed min-h-[44px]"
            >
              <CheckCircle2 size={16} />
              <span>Opportunity Completed</span>
            </button>
          ) : statusMeta.label === 'Pending Review' ? (
            <button
              disabled
              className="w-full py-3 px-4 rounded-xl bg-warning/10 border border-warning/30 text-warning text-xs font-bold flex items-center justify-center gap-2 cursor-not-allowed min-h-[44px]"
            >
              <Clock size={16} />
              <span>Under Verification</span>
            </button>
          ) : !statusMeta.isActionable ? (
            <button
              disabled
              className="w-full py-3 px-4 rounded-xl bg-surface-bright border border-border text-text-tertiary text-xs font-bold flex items-center justify-center gap-2 cursor-not-allowed min-h-[44px]"
            >
              <Lock size={16} />
              <span>{statusMeta.label}</span>
            </button>
          ) : (
            <button
              onClick={() => {
                onAction();
                onClose();
              }}
              className="w-full py-3 px-4 rounded-xl bg-primary hover:bg-primary-hover text-white text-xs md:text-sm font-bold transition-all flex items-center justify-center gap-2 shadow-lg shadow-primary/20 active:scale-[0.99] min-h-[44px]"
            >
              <span>{statusMeta.label === 'In Progress' ? 'Continue Opportunity' : 'Start Opportunity'}</span>
              <ArrowUpRight size={16} />
            </button>
          )}
        </div>
      </motion.div>
    </div>
  );
};
