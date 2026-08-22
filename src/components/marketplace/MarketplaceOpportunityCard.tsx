import React from 'react';
import { Clock, ChevronRight } from 'lucide-react';
import { MarketplaceOpportunity, DIFFICULTY_CONFIG } from '../../types/marketplace';
import { cn } from '../../utils';

export function getCanonicalStatus(status: string | undefined): {
  label: string;
  badgeClass: string;
  isActionable: boolean;
  ctaText: string;
} {
  switch (status?.toLowerCase()) {
    case 'in_progress':
    case 'started':
      return {
        label: 'In Progress',
        badgeClass: 'bg-primary/10 border-primary/20 text-primary',
        isActionable: true,
        ctaText: 'Continue',
      };
    case 'pending':
    case 'pending_review':
    case 'submitted':
    case 'awaiting_verification':
      return {
        label: 'Pending Review',
        badgeClass: 'bg-warning/10 border-warning/20 text-warning',
        isActionable: false,
        ctaText: 'Verification pending',
      };
    case 'completed':
    case 'claimed':
    case 'verified':
    case 'reward_issued':
      return {
        label: 'Completed',
        badgeClass: 'bg-success/10 border-success/20 text-success',
        isActionable: false,
        ctaText: 'Completed',
      };
    case 'rejected':
      return {
        label: 'Rejected',
        badgeClass: 'bg-danger/10 border-danger/20 text-danger',
        isActionable: true,
        ctaText: 'Try Again',
      };
    case 'expired':
    case 'archived':
      return {
        label: 'Expired',
        badgeClass: 'bg-surface-bright border-border text-text-tertiary',
        isActionable: false,
        ctaText: 'Expired',
      };
    case 'cooldown':
    case 'on_cooldown':
      return {
        label: 'On Cooldown',
        badgeClass: 'bg-surface-bright border-border text-text-tertiary',
        isActionable: false,
        ctaText: 'Cooldown',
      };
    case 'locked':
      return {
        label: 'Locked',
        badgeClass: 'bg-surface-bright border-border text-text-tertiary',
        isActionable: false,
        ctaText: 'Locked',
      };
    case 'cancelled':
      return {
        label: 'Cancelled',
        badgeClass: 'bg-surface-bright border-border text-text-tertiary',
        isActionable: false,
        ctaText: 'Cancelled',
      };
    default:
      return {
        label: 'Available',
        badgeClass: 'bg-surface-bright border-border text-text-secondary',
        isActionable: true,
        ctaText: 'Start',
      };
  }
}

interface MarketplaceOpportunityCardProps {
  opportunity: MarketplaceOpportunity;
  userTaskStatus?: string;
  onSelect: () => void;
}

export const MarketplaceOpportunityCard: React.FC<MarketplaceOpportunityCardProps> = ({
  opportunity,
  userTaskStatus,
  onSelect,
}) => {
  const diffConfig = DIFFICULTY_CONFIG[opportunity.metadata.difficulty] || DIFFICULTY_CONFIG.medium;
  const canonicalStatus = getCanonicalStatus(userTaskStatus || opportunity.status);
  const providerLabel = opportunity.providerName || (opportunity.source === 'provider' ? 'Partner' : 'PulseEarn');

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onSelect}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onSelect();
        }
      }}
      className="p-4 rounded-2xl border border-border bg-surface hover:border-border-bright cursor-pointer flex flex-col justify-between space-y-3.5 transition-all shadow-xs hover:shadow-md group focus:outline-none focus:ring-2 focus:ring-primary/40"
    >
      <div className="space-y-2.5">
        {/* Top Header: Provider & Difficulty */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 overflow-hidden">
            <span className="text-[10px] font-bold text-text-tertiary px-2 py-0.5 rounded bg-surface-bright border border-border truncate font-mono">
              {providerLabel}
            </span>
            <span className="text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-primary/10 text-primary border border-primary/20 truncate">
              {opportunity.metadata.category}
            </span>
          </div>

          <div className="flex items-center gap-1 shrink-0">
            {userTaskStatus && (
              <span className={cn('text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded border font-mono', canonicalStatus.badgeClass)}>
                {canonicalStatus.label}
              </span>
            )}
            {opportunity.metadata.difficulty && (
              <span
                className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded border"
                style={{ color: diffConfig.color, backgroundColor: diffConfig.bgColor, borderColor: `${diffConfig.color}33` }}
              >
                {diffConfig.label}
              </span>
            )}
          </div>
        </div>

        {/* Title & Description */}
        <div>
          <h3 className="text-xs sm:text-sm font-bold text-text-primary group-hover:text-primary transition-colors line-clamp-1">
            {opportunity.title}
          </h3>
          {opportunity.description && (
            <p className="text-[11px] text-text-tertiary line-clamp-2 mt-1 leading-relaxed">
              {opportunity.description}
            </p>
          )}
        </div>
      </div>

      {/* Rewards & CTA */}
      <div className="space-y-2.5 pt-2 border-t border-border/60">
        <div className="flex items-center justify-between text-xs">
          <div className="flex items-baseline gap-1">
            <span className="text-sm sm:text-base font-black text-success tabular-nums">
              +{opportunity.reward.points}
            </span>
            <span className="text-[9px] font-bold text-text-tertiary uppercase">PTS</span>
            {opportunity.reward.xp > 0 && (
              <span className="text-[9px] text-primary font-bold ml-1 font-mono">
                +{opportunity.reward.xp} XP
              </span>
            )}
          </div>

          {opportunity.metadata.estimatedTime && (
            <span className="text-[10px] text-text-tertiary flex items-center gap-1 font-mono">
              <Clock size={11} />
              {opportunity.metadata.estimatedTime}
            </span>
          )}
        </div>

        <button
          onClick={(e) => {
            e.stopPropagation();
            onSelect();
          }}
          className={cn(
            'w-full py-2 px-3 rounded-xl border text-xs font-bold transition-all flex items-center justify-center gap-1.5 min-h-[36px]',
            canonicalStatus.label === 'Completed'
              ? 'bg-success/10 border-success/20 text-success cursor-default'
              : canonicalStatus.label === 'Pending Review'
              ? 'bg-warning/10 border-warning/20 text-warning cursor-default'
              : 'bg-surface-bright hover:bg-primary hover:text-white border-border text-text-secondary'
          )}
        >
          <span>{canonicalStatus.ctaText}</span>
          <ChevronRight size={13} />
        </button>
      </div>
    </div>
  );
};
