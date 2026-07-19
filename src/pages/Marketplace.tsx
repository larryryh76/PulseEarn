/**
 * PulseEarn Marketplace
 * 
 * The unified earning ecosystem of PulseEarn.
 * All opportunities (internal and external) presented as one seamless experience.
 */

import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Compass,
  Sparkles,
  TrendingUp,
  Clock,
  Zap,
  RefreshCw,
  Wifi,
  WifiOff,
  AlertCircle,
  CheckCircle2,
  Globe,
  ExternalLink,
  X,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useMarketplace } from '../hooks/useMarketplace';
import {
  OpportunityCard,
  MarketplacePageSkeleton,
  Section,
  CategoryTabs,
  ViewModeToggle,
  SearchBar,
  FilterPanel,
  SortDropdown,
  ActiveFilterTags,
} from '../components/marketplace';
import {
  MarketplaceOpportunity,
  OpportunityCategory,
  MARKETPLACE_CATEGORIES,
} from '../types/marketplace';
import { cn } from '../utils';
import toast from 'react-hot-toast';

// ─── Main Component ────────────────────────────────────────────────────────────

const Marketplace: React.FC = () => {
  const { currentUser } = useAuth();
  const {
    sections,
    opportunities,
    providers,
    trending,
    byCategory,
    searchResults,
    isLoading,
    isLoadingProviders,
    error,
    refresh,
    openOpportunity,
    activeFilters,
    setFilters,
    clearFilters,
    selectedCategory,
    setSelectedCategory,
    viewMode,
    setViewMode,
  } = useMarketplace();

  // Local state
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('reward');
  const [showRefresh, setShowRefresh] = useState(false);
  const [activeProvider, setActiveProvider] = useState<{ id: string; name: string; launchUrl: string } | null>(null);

  // Refetch providers periodically
  useEffect(() => {
    const interval = setInterval(() => {
      if (currentUser && !isLoadingProviders) {
        refresh().catch(console.error);
      }
    }, 60000); // Refresh every minute

    return () => clearInterval(interval);
  }, [currentUser, isLoadingProviders, refresh]);

  // Handle refresh
  const handleRefresh = useCallback(async () => {
    setShowRefresh(true);
    try {
      await refresh();
      toast.success('Marketplace refreshed');
    } catch (err) {
      toast.error('Failed to refresh');
    } finally {
      setShowRefresh(false);
    }
  }, [refresh]);

  // Handle opportunity open
  const handleOpenOpportunity = useCallback((opp: MarketplaceOpportunity) => {
    if (opp.source === 'provider' && opp.action.url) {
      // Check for inline embed support
      if (opp.metadata.launchMode === 'embed') {
        setActiveProvider({
          id: opp.providerId || 'custom',
          name: opp.providerName || 'Provider',
          launchUrl: opp.action.url,
        });
        // Call openOpportunity to track click/launch metrics, without opening a new tab
        openOpportunity(opp);
      } else {
        // Track and open external offer
        toast.loading('Opening offer...', { id: 'opening-offer' });
        openOpportunity(opp);
        setTimeout(() => toast.dismiss('opening-offer'), 1000);
      }
    } else if (opp.action.actionType === 'claim') {
      // Handle internal claim
      toast(`Starting: ${opp.title}`, { icon: '🚀' });
    }
  }, [openOpportunity]);

  // Filter opportunities by selected category
  const getDisplayOpportunities = useCallback(() => {
    if (selectedCategory === 'all') {
      if (searchQuery) {
        return searchResults({
          query: searchQuery,
          filters: activeFilters,
          sortBy: sortBy as 'reward' | 'time' | 'difficulty' | 'popularity' | 'newest',
        });
      }
      return opportunities;
    }

    return byCategory(selectedCategory);
  }, [selectedCategory, searchQuery, activeFilters, sortBy, opportunities, byCategory, searchResults]);

  // Category tabs data
  const categoryTabs = [
    { id: 'all', label: 'All' },
    ...MARKETPLACE_CATEGORIES.map(cat => ({
      id: cat.id,
      label: cat.label,
    })),
  ];

  // Sort options
  const sortOptions = [
    { value: 'reward', label: 'Highest Reward' },
    { value: 'time', label: 'Fastest' },
    { value: 'popularity', label: 'Most Popular' },
    { value: 'newest', label: 'Newest' },
  ];

  // Provider connection status
  const connectedProviders = providers.filter(p => p.connectionStatus === 'connected');
  const offlineProviders = providers.filter(p => p.connectionStatus === 'offline');

  // Loading state
  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="container mx-auto px-4 py-6 max-w-7xl">
          <MarketplacePageSkeleton />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="sticky top-0 z-30 bg-background/80 backdrop-blur-xl border-b border-border">
        <div className="container mx-auto px-4 py-4 max-w-7xl">
          <div className="flex items-center justify-between gap-4">
            {/* Title */}
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center">
                <Compass size={20} className="text-primary" />
              </div>
              <div>
                <h1 className="text-lg font-bold text-text-primary">Marketplace</h1>
                <p className="text-[10px] text-text-tertiary">
                  {opportunities.length} opportunities available
                </p>
              </div>
            </div>

            {/* Provider Status */}
            <div className="flex items-center gap-2">
              {connectedProviders.length > 0 && (
                <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20">
                  <Wifi size={10} className="text-emerald-400" />
                  <span className="text-[9px] font-bold text-emerald-400">
                    {connectedProviders.length} providers
                  </span>
                </div>
              )}
              {offlineProviders.length > 0 && (
                <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-500/10 border border-amber-500/20">
                  <WifiOff size={10} className="text-amber-400" />
                  <span className="text-[9px] font-bold text-amber-400">
                    {offlineProviders.length} offline
                  </span>
                </div>
              )}

              {/* Refresh Button */}
              <button
                onClick={handleRefresh}
                disabled={showRefresh}
                className="p-2 rounded-lg border border-border bg-surface hover:border-primary/40 transition-all disabled:opacity-50"
              >
                <RefreshCw size={16} className={cn('text-text-secondary', showRefresh && 'animate-spin')} />
              </button>
            </div>
          </div>

          {/* Search & Filters */}
          <div className="mt-4 flex flex-col sm:flex-row gap-3">
            <SearchBar
              value={searchQuery}
              onChange={setSearchQuery}
              placeholder="Search opportunities..."
              className="flex-1"
            />
            <div className="flex items-center gap-2">
              <FilterPanel
                filters={activeFilters}
                onFiltersChange={setFilters}
                onClear={clearFilters}
              />
              <SortDropdown
                value={sortBy}
                onChange={setSortBy}
                options={sortOptions}
              />
              <ViewModeToggle
                viewMode={viewMode}
                onViewModeChange={setViewMode}
              />
            </div>
          </div>

          {/* Active Filters */}
          <ActiveFilterTags
            filters={activeFilters}
            onRemove={(key, value) => {
              if (value) {
                const current = activeFilters[key as keyof typeof activeFilters] as string[] | undefined;
                if (current) {
                  setFilters({
                    ...activeFilters,
                    [key]: current.filter(v => v !== value),
                  });
                }
              } else {
                setFilters({ ...activeFilters, [key]: undefined });
              }
            }}
            className="mt-3"
          />

          {/* Category Tabs */}
          <div className="mt-4">
            <CategoryTabs
              categories={categoryTabs}
              activeCategory={selectedCategory}
              onCategoryChange={(id) => setSelectedCategory(id as OpportunityCategory | 'all')}
            />
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="container mx-auto px-4 py-6 max-w-7xl">
        {/* Error Banner */}
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6 p-4 rounded-xl border border-danger/20 bg-danger/10 flex items-center gap-3"
          >
            <AlertCircle size={18} className="text-danger shrink-0" />
            <div className="flex-1">
              <p className="text-sm font-medium text-danger">{error}</p>
              <p className="text-xs text-text-tertiary mt-0.5">
                Some external offers may not be available
              </p>
            </div>
            <button
              onClick={handleRefresh}
              className="px-3 py-1.5 rounded-lg bg-danger/20 text-danger text-xs font-bold hover:bg-danger/30 transition-colors"
            >
              Retry
            </button>
          </motion.div>
        )}

        {/* Loading Providers */}
        {isLoadingProviders && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="mb-6 p-4 rounded-xl border border-border bg-surface flex items-center gap-3"
          >
            <RefreshCw size={16} className="text-primary animate-spin" />
            <p className="text-sm text-text-secondary">Loading external offers...</p>
          </motion.div>
        )}

        {/* Sections View */}
        {viewMode === 'sections' && !searchQuery && selectedCategory === 'all' && (
          <div className="space-y-10">
            {sections.map((section, index) => (
              <motion.div
                key={section.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
              >
                <Section
                  section={section}
                  onOpenOpportunity={handleOpenOpportunity}
                />
              </motion.div>
            ))}

            {sections.length === 0 && !isLoading && (
              <EmptyState
                title="No opportunities yet"
                description="Check back soon for new ways to earn"
              />
            )}
          </div>
        )}

        {/* Grid/List View */}
        {(viewMode === 'grid' || viewMode === 'list' || searchQuery || selectedCategory !== 'all') && (
          <div className="space-y-6">
            {/* Results Header */}
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-base font-bold text-text-primary">
                  {selectedCategory === 'all' ? 'All Opportunities' : formatCategory(selectedCategory)}
                </h2>
                <p className="text-xs text-text-tertiary mt-0.5">
                  {getDisplayOpportunities().length} results
                </p>
              </div>
            </div>

            {/* Results Grid */}
            {getDisplayOpportunities().length > 0 ? (
              <div
                className={cn(
                  viewMode === 'list'
                    ? 'space-y-3'
                    : 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4'
                )}
              >
                {getDisplayOpportunities().map(opp => (
                  <OpportunityCard
                    key={opp.id}
                    opportunity={opp}
                    variant={viewMode === 'list' ? 'row' : 'default'}
                    onOpen={handleOpenOpportunity}
                    showProviderBadge={viewMode !== 'list'}
                  />
                ))}
              </div>
            ) : (
              <EmptyState
                title="No results found"
                description={
                  searchQuery
                    ? 'Try different search terms or filters'
                    : 'No opportunities in this category yet'
                }
              />
            )}
          </div>
        )}

        {/* Quick Stats */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="mt-12 grid grid-cols-2 md:grid-cols-4 gap-4"
        >
          <StatCard
            icon={<Zap className="text-amber-400" />}
            label="Highest Reward"
            value={`+${Math.max(...opportunities.map(o => o.reward.points), 0).toLocaleString()} PTS`}
          />
          <StatCard
            icon={<TrendingUp className="text-emerald-400" />}
            label="Trending"
            value={trending.length.toString()}
          />
          <StatCard
            icon={<CheckCircle2 className="text-blue-400" />}
            label="New Today"
            value={opportunities.filter(o => o.engagement.isNew).length.toString()}
          />
          <StatCard
            icon={<Clock className="text-purple-400" />}
            label="Expiring Soon"
            value={opportunities.filter(o => o.engagement.expiringSoon).length.toString()}
          />
        </motion.div>
      </div>

      {/* Embedded active provider modal/overlay for in-site completions */}
      <AnimatePresence>
        {activeProvider && activeProvider.launchUrl && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-background flex flex-col"
          >
            <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-surface shrink-0">
              <div className="flex items-center gap-2 min-w-0">
                <Globe size={15} className="text-primary shrink-0" />
                <span className="text-[13px] font-bold text-text-primary truncate">{activeProvider.name}</span>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <a
                  href={activeProvider.launchUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-border text-text-tertiary hover:text-text-primary hover:bg-surface-bright transition-all text-[10px] font-bold uppercase tracking-widest"
                >
                  New Tab <ExternalLink size={12} />
                </a>
                <button
                  onClick={() => setActiveProvider(null)}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-primary text-white hover:bg-primary-bright transition-all text-[10px] font-bold uppercase tracking-widest cursor-pointer"
                >
                  Close <X size={12} />
                </button>
              </div>
            </div>
            <iframe
              title={`${activeProvider.name} Offerwall`}
              src={activeProvider.launchUrl}
              className="flex-1 w-full border-0 bg-white"
              allow="fullscreen; clipboard-write"
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

// ─── Stat Card ────────────────────────────────────────────────────────────────

const StatCard: React.FC<{
  icon: React.ReactNode;
  label: string;
  value: string;
}> = ({ icon, label, value }) => (
  <div className="p-4 rounded-xl border border-border bg-surface">
    <div className="flex items-center gap-2 mb-2">
      {icon}
      <span className="text-[10px] font-bold uppercase tracking-widest text-text-tertiary">
        {label}
      </span>
    </div>
    <p className="text-lg font-black text-text-primary">{value}</p>
  </div>
);

// ─── Empty State ───────────────────────────────────────────────────────────────

const EmptyState: React.FC<{ title: string; description: string }> = ({
  title,
  description,
}) => (
  <div className="text-center py-16">
    <div className="w-16 h-16 rounded-2xl bg-surface border border-border flex items-center justify-center mx-auto mb-4">
      <Sparkles size={24} className="text-text-tertiary" />
    </div>
    <h3 className="text-base font-bold text-text-primary mb-1">{title}</h3>
    <p className="text-sm text-text-tertiary">{description}</p>
  </div>
);

// ─── Utilities ────────────────────────────────────────────────────────────────

function formatCategory(category: string): string {
  return category
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

export default Marketplace;
