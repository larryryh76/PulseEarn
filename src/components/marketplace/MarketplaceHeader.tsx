import React from 'react';
import { RefreshCw, Wallet, Search, X } from 'lucide-react';

interface MarketplaceHeaderProps {
  pointsBalance: number;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  onRefresh: () => void;
  isRefreshing: boolean;
}

export const MarketplaceHeader: React.FC<MarketplaceHeaderProps> = ({
  pointsBalance,
  searchQuery,
  onSearchChange,
  onRefresh,
  isRefreshing,
}) => {
  return (
    <header className="p-4 sm:p-5 rounded-2xl bg-surface border border-border shadow-xs space-y-4">
      {/* Title & User Context Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="space-y-0.5">
          <h1 className="text-xl sm:text-2xl font-black text-text-primary tracking-tight">
            Earn more with PulseEarn
          </h1>
          <p className="text-xs sm:text-sm text-text-secondary">
            Discover tasks, offers, surveys, campaigns, and other verified earning opportunities.
          </p>
        </div>

        {/* Balance Badge & Refresh Button */}
        <div className="flex items-center gap-2.5 shrink-0">
          <div className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-surface-bright border border-border">
            <div className="w-6 h-6 rounded-lg bg-success/10 text-success flex items-center justify-center shrink-0">
              <Wallet size={14} />
            </div>
            <div className="flex items-baseline gap-1">
              <span className="text-xs font-black text-text-primary tabular-nums">
                {pointsBalance.toLocaleString()}
              </span>
              <span className="text-[10px] font-bold text-text-tertiary uppercase">PTS</span>
            </div>
          </div>

          <button
            onClick={onRefresh}
            disabled={isRefreshing}
            aria-label="Refresh marketplace inventory"
            className="flex items-center justify-center w-9 h-9 rounded-xl border border-border bg-surface hover:bg-surface-bright text-text-secondary hover:text-text-primary transition-colors disabled:opacity-50"
            title="Refresh opportunities"
          >
            <RefreshCw size={14} className={isRefreshing ? 'animate-spin text-primary' : 'text-text-tertiary'} />
          </button>
        </div>
      </div>

      {/* Integrated Compact Search Bar */}
      <div className="relative">
        <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-text-tertiary" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          aria-label="Search opportunities by title, provider, category, or tag"
          placeholder="Search opportunities by title, provider, category, or tag..."
          className="w-full bg-surface-bright/70 border border-border rounded-xl pl-9 pr-8 py-2 text-xs text-text-primary focus:outline-none focus:border-primary transition-colors placeholder:text-text-tertiary min-h-[40px]"
        />
        {searchQuery && (
          <button
            onClick={() => onSearchChange('')}
            aria-label="Clear search"
            className="absolute right-3 top-1/2 -translate-y-1/2 text-text-tertiary hover:text-text-primary p-1"
          >
            <X size={13} />
          </button>
        )}
      </div>
    </header>
  );
};
