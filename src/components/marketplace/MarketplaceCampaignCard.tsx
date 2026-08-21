import React from 'react';
import { Target, ChevronRight, Layers } from 'lucide-react';
import { MarketplaceOpportunity } from '../../types/marketplace';

interface MarketplaceCampaignCardProps {
  campaignOpportunity: MarketplaceOpportunity;
  onSelect: () => void;
}

export const MarketplaceCampaignCard: React.FC<MarketplaceCampaignCardProps> = ({
  campaignOpportunity,
  onSelect,
}) => {
  const sponsorName = campaignOpportunity.providerName || 'PulseEarn Sponsored';

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
      className="p-4 rounded-2xl border border-primary/30 bg-primary/5 hover:border-primary/60 cursor-pointer flex flex-col justify-between space-y-3.5 transition-all shadow-xs hover:shadow-md group focus:outline-none focus:ring-2 focus:ring-primary/40"
    >
      <div className="space-y-2.5">
        {/* Campaign Header */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 overflow-hidden">
            <span className="text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-primary/20 text-primary border border-primary/30 font-mono flex items-center gap-1">
              <Layers size={11} />
              <span>Campaign</span>
            </span>
            <span className="text-[10px] font-bold text-text-tertiary px-2 py-0.5 rounded bg-surface-bright border border-border truncate font-mono">
              {sponsorName}
            </span>
          </div>

          <span className="text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-success/10 text-success border border-success/20 font-mono">
            Grouped Experience
          </span>
        </div>

        {/* Campaign Title & Subtitle */}
        <div>
          <h3 className="text-xs sm:text-sm font-bold text-text-primary group-hover:text-primary transition-colors line-clamp-1">
            {campaignOpportunity.title}
          </h3>
          {campaignOpportunity.description && (
            <p className="text-[11px] text-text-tertiary line-clamp-2 mt-1 leading-relaxed">
              {campaignOpportunity.description}
            </p>
          )}
        </div>
      </div>

      {/* Rewards & CTA */}
      <div className="space-y-2.5 pt-2 border-t border-primary/10">
        <div className="flex items-center justify-between text-xs">
          <div className="flex items-baseline gap-1">
            <span className="text-sm sm:text-base font-black text-success tabular-nums">
              +{campaignOpportunity.reward.points}
            </span>
            <span className="text-[9px] font-bold text-text-tertiary uppercase">PTS</span>
            {campaignOpportunity.reward.xp > 0 && (
              <span className="text-[9px] text-primary font-bold ml-1 font-mono">
                +{campaignOpportunity.reward.xp} XP
              </span>
            )}
          </div>

          <span className="text-[10px] text-primary font-bold flex items-center gap-1 font-mono">
            <Target size={12} />
            <span>Multi-Task</span>
          </span>
        </div>

        <button
          onClick={(e) => {
            e.stopPropagation();
            onSelect();
          }}
          className="w-full py-2 px-3 rounded-xl bg-primary hover:bg-primary-hover text-white text-xs font-bold transition-all flex items-center justify-center gap-1.5 min-h-[36px]"
        >
          <span>Open Campaign</span>
          <ChevronRight size={13} />
        </button>
      </div>
    </div>
  );
};
