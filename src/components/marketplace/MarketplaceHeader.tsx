import React from 'react';
import { RefreshCw, Wallet } from 'lucide-react';
import { cn } from '../../utils';
import { formatUSD, PTS_TO_USD } from '../../utils/finance';

interface MarketplaceHeaderProps {
  userBalancePoints: number;
  progressionTier: {
    name: string;
    level: number;
    badge: string;
    color: string;
  };
  isLoading: boolean;
  onRefresh: () => void;
}

export const MarketplaceHeader: React.FC<MarketplaceHeaderProps> = ({
  userBalancePoints,
  progressionTier,
  isLoading,
  onRefresh,
}) => {
  const usdValue = formatUSD(PTS_TO_USD(userBalancePoints));

  return (
    <header className="rounded-2xl bg-surface border border-border p-5 md:p-6 shadow-xs relative overflow-hidden">
      {/* Subtle background ambient glow */}
      <div className="absolute top-0 right-0 -mr-16 -mt-16 w-64 h-64 bg-primary/5 rounded-full blur-3xl pointer-events-none" />

      <div className="relative z-10 flex flex-col md:flex-row md:items-center md:justify-between gap-5">
        {/* Title & Headline */}
        <div className="space-y-1.5 max-w-xl">
          <div className="flex flex-wrap items-center gap-2.5">
            <h1 className="text-xl md:text-2xl font-black text-text-primary tracking-tight">
              Earn with PulseEarn
            </h1>
            <span
              className={cn(
                'text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-md border font-mono shadow-xs',
                progressionTier.color
              )}
            >
              {progressionTier.name} • Level {progressionTier.level}
            </span>
          </div>
          <p className="text-xs md:text-sm text-text-secondary leading-relaxed">
            Discover verified earning opportunities from multiple integrated providers, surveys, apps, and campaigns.
          </p>
        </div>

        {/* Real Balance & Refresh Button */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Balance Pill */}
          <div className="flex items-center gap-3 px-4 py-2.5 rounded-xl bg-surface-bright border border-border shadow-xs">
            <div className="w-9 h-9 rounded-lg bg-success/10 text-success border border-success/20 flex items-center justify-center shrink-0">
              <Wallet size={17} />
            </div>
            <div>
              <span className="text-[10px] uppercase font-bold text-text-tertiary block font-mono">
                Your Balance
              </span>
              <div className="flex items-baseline gap-2">
                <span className="text-base font-black text-text-primary tabular-nums tracking-tight">
                  {userBalancePoints.toLocaleString()} PTS
                </span>
                <span className="text-xs font-semibold text-text-tertiary">
                  ≈ {usdValue}
                </span>
              </div>
            </div>
          </div>

          {/* Refresh Inventory Action */}
          <button
            onClick={onRefresh}
            disabled={isLoading}
            aria-label="Refresh marketplace inventory"
            className="flex items-center gap-2 px-3.5 py-2.5 rounded-xl border border-border bg-surface hover:bg-surface-bright text-xs font-semibold text-text-secondary hover:text-text-primary transition-all disabled:opacity-50 min-h-[44px] shadow-xs active:scale-95"
          >
            <RefreshCw
              size={14}
              className={cn(isLoading ? 'animate-spin text-primary' : 'text-text-tertiary')}
            />
            <span className="hidden sm:inline">Refresh</span>
          </button>
        </div>
      </div>
    </header>
  );
};
