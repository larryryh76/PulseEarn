import React from 'react';
import { motion } from 'framer-motion';
import {
  Clock,
  ChevronRight,
  Smartphone,
  Monitor,
  CheckCircle2,
  ArrowUpRight,
} from 'lucide-react';
import {
  MarketplaceOpportunity,
  DIFFICULTY_CONFIG,
} from '../../types/marketplace';
import { cn } from '../../utils';
import { formatUSD, PTS_TO_USD } from '../../utils/finance';

// ─── Status Meta Helper ────────────────────────────────────────────────────────
export function getOpportunityStatusMeta(status: string | undefined): {
  label: string;
  badgeClass: string;
  isActionable: boolean;
} {
  switch (status?.toLowerCase()) {
    case 'in_progress':
    case 'started':
      return {
        label: 'In Progress',
        badgeClass: 'bg-primary/10 border-primary/30 text-primary',
        isActionable: true,
      };
    case 'pending':
    case 'pending_review':
    case 'submitted':
    case 'awaiting_verification':
      return {
        label: 'Pending Review',
        badgeClass: 'bg-warning/10 border-warning/30 text-warning',
        isActionable: false,
      };
    case 'completed':
    case 'claimed':
    case 'verified':
    case 'reward_issued':
      return {
        label: 'Completed',
        badgeClass: 'bg-success/10 border-success/30 text-success',
        isActionable: false,
      };
    case 'rejected':
      return {
        label: 'Rejected',
        badgeClass: 'bg-danger/10 border-danger/30 text-danger',
        isActionable: true,
      };
    case 'cooldown':
    case 'on_cooldown':
      return {
        label: 'Cooldown',
        badgeClass: 'bg-surface-bright border-border text-text-tertiary',
        isActionable: false,
      };
    case 'locked':
      return {
        label: 'Locked',
        badgeClass: 'bg-surface-bright border-border text-text-tertiary',
        isActionable: false,
      };
    default:
      return {
        label: 'Available',
        badgeClass: 'bg-surface-bright border-border text-text-secondary',
        isActionable: true,
      };
  }
}

interface OpportunityCardProps {
  opportunity: MarketplaceOpportunity;
  userTask?: { status?: string };
  onSelect: () => void;
  variant?: 'auto' | 'standard' | 'featured' | 'survey' | 'app' | 'mission' | 'campaign' | 'social';
}

export const OpportunityCard: React.FC<OpportunityCardProps> = ({
  opportunity,
  userTask,
  onSelect,
  variant = 'auto',
}) => {
  const category = opportunity.metadata?.category || 'offers';
  const diffConfig =
    DIFFICULTY_CONFIG[opportunity.metadata?.difficulty] || DIFFICULTY_CONFIG.medium;
  const statusMeta = getOpportunityStatusMeta(userTask?.status || opportunity.status);
  const providerName =
    opportunity.providerName || (opportunity.source === 'provider' ? 'Partner Offer' : 'PulseEarn');

  const pts = opportunity.reward?.points ?? 0;
  const xp = opportunity.reward?.xp ?? 0;
  const usdValue = formatUSD(PTS_TO_USD(pts));
  const timeEst = opportunity.metadata?.estimatedTime || '~5 min';

  // Determine card archetype if auto
  const resolvedVariant =
    variant !== 'auto'
      ? variant
      : category === 'featured' || (opportunity.engagement?.trending && pts >= 1000)
      ? 'featured'
      : category === 'surveys'
      ? 'survey'
      : category === 'apps' || category === 'games'
      ? 'app'
      : category === 'missions'
      ? 'mission'
      : category === 'campaigns'
      ? 'campaign'
      : category === 'social' || category === 'community'
      ? 'social'
      : 'standard';

  // Device detection from tags
  const isMobile = opportunity.metadata?.tags?.some((t) =>
    ['mobile', 'app', 'android', 'ios'].includes(t.toLowerCase())
  );
  const isDesktop = opportunity.metadata?.tags?.some((t) =>
    ['desktop', 'web', 'browser'].includes(t.toLowerCase())
  );

  return (
    <motion.div
      whileHover={{ y: -2 }}
      transition={{ duration: 0.15 }}
      onClick={onSelect}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onSelect();
        }
      }}
      className={cn(
        'group relative rounded-2xl border transition-all cursor-pointer flex flex-col justify-between overflow-hidden shadow-xs hover:shadow-md focus:outline-none focus:ring-2 focus:ring-primary/50 text-left',
        resolvedVariant === 'featured'
          ? 'bg-gradient-to-b from-surface via-surface to-surface-bright/50 border-primary/30 hover:border-primary/60 p-4 md:p-5'
          : resolvedVariant === 'survey'
          ? 'bg-surface border-border hover:border-emerald-500/40 p-4'
          : resolvedVariant === 'app'
          ? 'bg-surface border-border hover:border-indigo-500/40 p-4'
          : resolvedVariant === 'mission'
          ? 'bg-surface border-border hover:border-pink-500/40 p-4'
          : 'bg-surface border-border hover:border-border-bright p-4'
      )}
    >
      {/* Top Bar: Badges, Category, Provider, Status */}
      <div className="space-y-3">
        <div className="flex items-center justify-between gap-2">
          {/* Category & Provider Pill */}
          <div className="flex items-center gap-1.5 min-w-0">
            <span
              className={cn(
                'text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md border truncate font-mono',
                resolvedVariant === 'featured'
                  ? 'bg-primary/15 text-primary border-primary/30'
                  : resolvedVariant === 'survey'
                  ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                  : resolvedVariant === 'app'
                  ? 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20'
                  : 'bg-surface-bright text-text-secondary border-border'
              )}
            >
              {category}
            </span>

            <span className="text-[10px] font-medium text-text-tertiary px-1.5 py-0.5 rounded bg-surface-bright/60 border border-border/80 truncate flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-primary/70 shrink-0" />
              <span className="truncate">{providerName}</span>
            </span>
          </div>

          {/* Right Indicators: Device / Status / Difficulty */}
          <div className="flex items-center gap-1.5 shrink-0">
            {isMobile && !isDesktop && (
              <span title="Mobile Only" className="text-text-tertiary p-0.5">
                <Smartphone size={12} />
              </span>
            )}
            {isDesktop && !isMobile && (
              <span title="Desktop Only" className="text-text-tertiary p-0.5">
                <Monitor size={12} />
              </span>
            )}

            {userTask?.status ? (
              <span
                className={cn(
                  'text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md border font-mono',
                  statusMeta.badgeClass
                )}
              >
                {statusMeta.label}
              </span>
            ) : (
              <span
                className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded border font-mono"
                style={{
                  color: diffConfig.color,
                  backgroundColor: diffConfig.bgColor,
                  borderColor: `${diffConfig.color}33`,
                }}
              >
                {diffConfig.label}
              </span>
            )}
          </div>
        </div>

        {/* Title & Description */}
        <div className="space-y-1">
          <h3 className="text-xs md:text-sm font-bold text-text-primary group-hover:text-primary transition-colors line-clamp-1">
            {opportunity.title}
          </h3>
          <p className="text-[11px] text-text-tertiary line-clamp-2 leading-relaxed font-normal">
            {opportunity.description ||
              opportunity.instructions ||
              'Complete the steps to receive your verified reward.'}
          </p>
        </div>
      </div>

      {/* Bottom Section: Dominant Reward & Fast CTA */}
      <div className="mt-4 pt-3 border-t border-border/60 flex items-center justify-between gap-2">
        {/* Dominant Reward Display */}
        <div className="min-w-0">
          <div className="flex items-baseline gap-1.5">
            <span className="text-base md:text-lg font-black text-success tabular-nums tracking-tight">
              +{pts.toLocaleString()}
            </span>
            <span className="text-[10px] font-bold text-text-tertiary uppercase font-mono">
              PTS
            </span>
            <span className="text-[11px] font-medium text-text-tertiary">
              ({usdValue})
            </span>
          </div>

          <div className="flex items-center gap-2 text-[10px] text-text-tertiary font-mono mt-0.5">
            <span className="flex items-center gap-1">
              <Clock size={11} className="text-text-tertiary" />
              <span>{timeEst}</span>
            </span>
            {xp > 0 && (
              <span className="text-primary font-semibold">+{xp} XP</span>
            )}
          </div>
        </div>

        {/* Compact Action CTA */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            onSelect();
          }}
          className={cn(
            'px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shrink-0 min-h-[38px] shadow-xs active:scale-95',
            statusMeta.label === 'Completed'
              ? 'bg-success/10 text-success border border-success/20 cursor-default'
              : statusMeta.label === 'In Progress'
              ? 'bg-primary text-white hover:bg-primary-hover shadow-primary/20'
              : 'bg-surface-bright text-text-secondary border border-border group-hover:bg-primary group-hover:text-white group-hover:border-primary'
          )}
        >
          {statusMeta.label === 'Completed' ? (
            <>
              <CheckCircle2 size={13} />
              <span>Done</span>
            </>
          ) : statusMeta.label === 'In Progress' ? (
            <>
              <span>Resume</span>
              <ArrowUpRight size={13} />
            </>
          ) : (
            <>
              <span>Start</span>
              <ChevronRight size={13} />
            </>
          )}
        </button>
      </div>
    </motion.div>
  );
};
